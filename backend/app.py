from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import json
import logging
from datetime import datetime
import re
from collections import defaultdict
import tempfile

# processing
import pdf2image
from PIL import Image
import cv2
import numpy as np

# ocr
try:
    import pytesseract
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    TESSERACT_AVAILABLE = True
except Exception as e:
    TESSERACT_AVAILABLE = False
    logging.warning(f"Tesseract not available: {str(e)}")

# nlp
SPACY_AVAILABLE = False
NLP = None

# db
try:
    from pymongo import MongoClient
    MONGO_CLIENT = MongoClient('mongodb://localhost:27017/')
    MONGO_DB = MONGO_CLIENT['document_search']
    MONGO_DOCS = MONGO_DB['documents']
    MONGO_AVAILABLE = True
except Exception as e:
    MONGO_AVAILABLE = False

try:
    from elasticsearch import Elasticsearch
    ES_CLIENT = Elasticsearch(['localhost:9200'])
    ES_CLIENT.info()
    ES_AVAILABLE = True
except Exception as e:
    ES_AVAILABLE = False

try:
    import psycopg2
    PG_CONN = psycopg2.connect(
        host="localhost",
        database="document_search",
        user="postgres",
        password="postgres"
    )
    PG_CURSOR = PG_CONN.cursor()
    PG_AVAILABLE = True
except Exception as e:
    PG_AVAILABLE = False

# flask
app = Flask(__name__)
CORS(app)

# config
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png', 'tiff', 'tif'}
MAX_FILE_SIZE = 50 * 1024 * 1024

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# log
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

#db functions

def init_databases():
    """Initialize all databases"""
    if MONGO_AVAILABLE:
        try:
            MONGO_DOCS.create_index("filename")
            MONGO_DOCS.create_index("upload_date")
            logger.info("MongoDB indexes created")
        except Exception as e:
            logger.warning(f"MongoDB indexing error: {str(e)}")
    
    if ES_AVAILABLE:
        try:
            ES_CLIENT.indices.create(
                index='documents',
                ignore=400,
                body={
                    "mappings": {
                        "properties": {
                            "filename": {"type": "text"},
                            "extracted_text": {"type": "text"},
                            "entities": {"type": "keyword"},
                            "keywords": {"type": "keyword"},
                            "upload_date": {"type": "date"}
                        }
                    }
                }
            )
            logger.info("Elasticsearch index created")
        except Exception as e:
            logger.warning(f"Elasticsearch indexing error: {str(e)}")
    
    if PG_AVAILABLE:
        try:
            PG_CURSOR.execute('''
                CREATE TABLE IF NOT EXISTS documents (
                    id SERIAL PRIMARY KEY,
                    filename VARCHAR(255) NOT NULL,
                    original_filename VARCHAR(255),
                    file_path VARCHAR(500),
                    upload_date TIMESTAMP,
                    file_size INTEGER,
                    pages INTEGER,
                    status VARCHAR(50),
                    extracted_text TEXT,
                    entities TEXT,
                    keywords TEXT
                )
            ''')
            PG_CONN.commit()
            logger.info("PostgreSQL tables created")
        except Exception as e:
            logger.warning(f"PostgreSQL table creation error: {str(e)}")

# img

def preprocess_image_cv2(image_path):
    """Preprocess image using OpenCV"""
    try:
        img = cv2.imread(image_path)
        if img is None:
            return image_path
        
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        denoised = cv2.fastNlMeansDenoising(gray, h=10)
        _, thresh = cv2.threshold(denoised, 150, 255, cv2.THRESH_BINARY)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        processed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        processed_path = image_path.replace('.', '_processed.')
        cv2.imwrite(processed_path, processed)
        return processed_path
    except Exception as e:
        logger.error(f"Image preprocessing error: {str(e)}")
        return image_path

# ocr functions

def extract_text_tesseract(image_path):
    """Extract text using Tesseract"""
    try:
        if not TESSERACT_AVAILABLE:
            return ""
        image = Image.open(image_path).convert("RGB")
        text = pytesseract.image_to_string(image)
        return text
    except Exception as e:
        logger.error(f"Tesseract error: {str(e)}")
        return ""

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF using Tesseract OCR safely"""
    extracted_text = ""
    pages = 0
    try:
        images = pdf2image.convert_from_path(pdf_path, dpi=300)
        pages = len(images)
        
        for i, image in enumerate(images):
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                temp_path = tmp.name
                image.save(temp_path, format='PNG')
            
            processed_path = preprocess_image_cv2(temp_path)
            page_text = extract_text_tesseract(processed_path)
            extracted_text += f"--- PAGE {i+1} ---\n{page_text}\n\n"
            
            for f in [temp_path, processed_path]:
                try:
                    os.remove(f)
                except:
                    pass
                
        return extracted_text, pages
    
    except Exception as e:
        logger.error(f"PDF extraction error: {str(e)}")
        return f"Error: {str(e)}", pages

def extract_text_from_image(image_path):
    """Extract text from image"""
    try:
        processed_path = preprocess_image_cv2(image_path)
        text = extract_text_tesseract(processed_path)
        try:
            if processed_path != image_path:
                os.remove(processed_path)
        except:
            pass
        return text, 1
    except Exception as e:
        logger.error(f"Image extraction error: {str(e)}")
        return f"Error: {str(e)}", 1

# keyword extract

def extract_entities_and_keywords(text):
    """Extract keywords from text"""
    try:
        if not text:
            return [], []
        
        words = re.findall(r'\b\w+\b', text.lower())
        stopwords = {
            'a','an','and','are','as','at','be','by','for','from',
            'has','he','in','is','it','its','of','on','or','that',
            'the','to','was','will','with','this','but','not','have'
        }
        keywords = [w for w in words if w not in stopwords and len(w) > 2]
        keywords = list(set(keywords))[:20]
        entities = []  # SpaCy disabled
        return entities, keywords
    except Exception as e:
        logger.error(f"Keyword extraction error: {str(e)}")
        return [], []

# db storage

def store_document(doc_data):
    doc_id = None
    if MONGO_AVAILABLE:
        try:
            result = MONGO_DOCS.insert_one(doc_data)
            doc_id = str(result.inserted_id)
            logger.info(f"Stored in MongoDB: {doc_id}")
        except Exception as e:
            logger.error(f"MongoDB storage error: {str(e)}")
    
    if PG_AVAILABLE:
        try:
            PG_CURSOR.execute('''
                INSERT INTO documents 
                (filename, original_filename, file_path, upload_date, file_size, pages, status, extracted_text, entities, keywords)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING id
            ''', (
                doc_data['filename'],
                doc_data['original_filename'],
                doc_data['file_path'],
                doc_data['upload_date'],
                doc_data['file_size'],
                doc_data['pages'],
                doc_data['status'],
                doc_data['extracted_text'],
                json.dumps(doc_data['entities']),
                json.dumps(doc_data['keywords'])
            ))
            pg_id = PG_CURSOR.fetchone()[0]
            PG_CONN.commit()
            doc_id = pg_id
            logger.info(f"Stored in PostgreSQL: {doc_id}")
        except Exception as e:
            logger.error(f"PostgreSQL storage error: {str(e)}")
    
    if ES_AVAILABLE:
        try:
            ES_CLIENT.index(
                index='documents',
                body={
                    'filename': doc_data['filename'],
                    'extracted_text': doc_data['extracted_text'],
                    'entities': doc_data['entities'],
                    'keywords': doc_data['keywords'],
                    'upload_date': doc_data['upload_date']
                }
            )
            logger.info("Indexed in Elasticsearch")
        except Exception as e:
            logger.error(f"Elasticsearch indexing error: {str(e)}")
    
    return doc_id

# api

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'databases': {
            'mongodb': MONGO_AVAILABLE,
            'elasticsearch': ES_AVAILABLE,
            'postgresql': PG_AVAILABLE,
            'tesseract': TESSERACT_AVAILABLE,
            'spacy': SPACY_AVAILABLE
        }
    })

@app.route('/api/upload', methods=['POST'])
def upload_document():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        filename = secure_filename(file.filename)
        file_ext = filename.rsplit('.',1)[1].lower() if '.' in filename else ''
        if file_ext not in ALLOWED_EXTENSIONS:
            return jsonify({'error': f'File type .{file_ext} not allowed'}), 400
        
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        file_size = os.path.getsize(file_path)
        logger.info(f"Processing {filename}")
        
        if file_ext == 'pdf':
            extracted_text, pages = extract_text_from_pdf(file_path)
        else:
            extracted_text, pages = extract_text_from_image(file_path)
        
        entities, keywords = extract_entities_and_keywords(extracted_text)
        
        doc_data = {
            'filename': filename,
            'original_filename': file.filename,
            'file_path': file_path,
            'upload_date': datetime.now(),
            'file_size': file_size,
            'pages': pages,
            'status': 'processed',
            'extracted_text': extracted_text,
            'entities': entities,
            'keywords': keywords
        }
        
        doc_id = store_document(doc_data)
        
        return jsonify({
            'success': True,
            'document_id': doc_id,
            'filename': filename,
            'pages': pages,
            'keywords': keywords,
            'entities': entities,
            'file_size': file_size
        }), 201
        
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

# run

if __name__ == '__main__':
    init_databases()
    
    print("\n" + "="*50)
    print("Document Digitization Backend Starting...")
    print("="*50)
    print(f"✓ Tesseract OCR: {TESSERACT_AVAILABLE}")
    print(f"✓ OpenCV: True")
    print(f"✓ SpaCy NLP: {SPACY_AVAILABLE}")
    print(f"✓ MongoDB: {MONGO_AVAILABLE}")
    print(f"✓ PostgreSQL: {PG_AVAILABLE}")
    print(f"✓ Elasticsearch: {ES_AVAILABLE}")
    print("="*50)
    print("Starting Flask backend on http://127.0.0.1:5000")
    print("="*50 + "\n")
    
    app.run(debug=True, port=5000)
