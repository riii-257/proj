from flask import request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import os
from datetime import datetime, timedelta
import logging
import json

logger = logging.getLogger(__name__)

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# ====== USER MANAGEMENT ======

def create_user(users_list, email, username, password=None, provider=None, provider_id=None):
    """Create new user and store in JSON"""
    try:
        user_data = {
            'id': len(users_list) + 1,
            'email': email,
            'username': username,
            'created_at': datetime.now().isoformat(),
            'provider': provider,
            'provider_id': provider_id,
            'avatar': None
        }
        
        if password:
            user_data['password'] = generate_password_hash(password)
        
        users_list.append(user_data)
        return user_data
    except Exception as e:
        logger.error(f"Create user error: {str(e)}")
        return None

def get_user_by_email(users_list, email):
    """Get user by email"""
    for user in users_list:
        if user['email'].lower() == email.lower():
            return user
    return None

def get_user_by_id(users_list, user_id):
    """Get user by ID"""
    for user in users_list:
        if user['id'] == user_id:
            return user
    return None

def verify_password(stored_hash, provided_password):
    """Verify password hash"""
    try:
        return check_password_hash(stored_hash, provided_password)
    except:
        return False

def load_users():
    """Load users from JSON file"""
    if os.path.exists('users.json'):
        try:
            with open('users.json', 'r') as f:
                return json.load(f)
        except:
            return []
    return []

def save_users(users_list):
    """Save users to JSON file"""
    try:
        with open('users.json', 'w') as f:
            json.dump(users_list, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Save users error: {str(e)}")
        return False

# ====== TOKEN MANAGEMENT ======

def generate_jwt_token(user_id):
    """Generate JWT token"""
    try:
        payload = {
            'user_id': user_id,
            'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
            'iat': datetime.utcnow()
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        return token
    except Exception as e:
        logger.error(f"Token generation error: {str(e)}")
        return None

def verify_jwt_token(token):
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get('user_id')
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        return None

# ====== API ROUTES ======

def setup_auth_routes(app):
    """Setup authentication routes"""
    
    @app.route('/api/auth/register', methods=['POST'])
    def register():
        """Register local user"""
        try:
            data = request.get_json()
            email = data.get('email', '').lower()
            username = data.get('username', '')
            password = data.get('password', '')
            
            if not all([email, username, password]):
                return jsonify({'error': 'Missing required fields'}), 400
            
            # Load existing users
            users = load_users()
            
            # Check if user exists
            existing = get_user_by_email(users, email)
            if existing:
                return jsonify({'error': 'Email already registered'}), 400
            
            # Create user
            user = create_user(users, email, username, password, provider='local')
            
            if not user:
                return jsonify({'error': 'Registration failed'}), 500
            
            # Save users
            save_users(users)
            
            # Generate token
            token = generate_jwt_token(user['id'])
            
            return jsonify({
                'success': True,
                'token': token,
                'user': {
                    'id': user['id'],
                    'email': user['email'],
                    'username': user['username'],
                    'provider': 'local'
                }
            }), 201
            
        except Exception as e:
            logger.error(f"Register error: {str(e)}")
            return jsonify({'error': 'Registration failed'}), 500
    
    @app.route('/api/auth/login', methods=['POST'])
    def login():
        """Login local user"""
        try:
            data = request.get_json()
            email = data.get('email', '').lower()
            password = data.get('password', '')
            
            if not all([email, password]):
                return jsonify({'error': 'Missing email or password'}), 400
            
            # Load users
            users = load_users()
            user = get_user_by_email(users, email)
            
            if not user or not verify_password(user.get('password', ''), password):
                return jsonify({'error': 'Invalid email or password'}), 401
            
            # Generate token
            token = generate_jwt_token(user['id'])
            
            return jsonify({
                'success': True,
                'token': token,
                'user': {
                    'id': user['id'],
                    'email': user['email'],
                    'username': user['username'],
                    'provider': user.get('provider', 'local')
                }
            }), 200
            
        except Exception as e:
            logger.error(f"Login error: {str(e)}")
            return jsonify({'error': 'Login failed'}), 500
    
    @app.route('/api/auth/verify', methods=['POST'])
    def verify_token():
        """Verify token and get user info"""
        try:
            token = request.headers.get('Authorization', '').replace('Bearer ', '')
            
            if not token:
                return jsonify({'error': 'No token provided'}), 401
            
            user_id = verify_jwt_token(token)
            
            if not user_id:
                return jsonify({'error': 'Invalid or expired token'}), 401
            
            # Load users
            users = load_users()
            user = get_user_by_id(users, user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            return jsonify({
                'success': True,
                'user': {
                    'id': user['id'],
                    'email': user['email'],
                    'username': user['username'],
                    'avatar': user.get('avatar'),
                    'provider': user.get('provider', 'local')
                }
            }), 200
            
        except Exception as e:
            logger.error(f"Verify token error: {str(e)}")
            return jsonify({'error': 'Token verification failed'}), 500
    
    @app.route('/api/auth/logout', methods=['POST'])
    def logout():
        """Logout user (client-side token deletion)"""
        return jsonify({'success': True, 'message': 'Logged out successfully'}), 200
    
    logger.info("Auth routes registered")