# 🧪 API Testing Guide - Role-Based Authentication

## 📋 Available Endpoints

### 🔐 Authentication Routes
- `POST /api/auth/register` - Register new user with role
- `POST /api/auth/login?role=STUDENT` - Login user to specific portal
- `POST /api/auth/logout` - Logout user

### 👤 User Routes (Protected)
- `GET /api/user/me` - Get current user info (requires authentication)

### 🎓 Role-Based Dashboard Routes (Protected)
- `GET /api/auth/student/dashboard` - Student dashboard (STUDENT role only)
- `GET /api/auth/teacher/dashboard` - Teacher dashboard (TEACHER role only)
- `GET /api/auth/admin` - Admin panel (ADMIN/SUPERADMIN roles only)

## 🔬 Testing with Postman/Thunder Client

### 1. Register User
```
Method: POST
URL: http://localhost:5000/api/auth/register
Body (JSON):
{
  "email": "student@example.com",
  "password": "test1234",
  "role": "STUDENT"
}
```

**Available Roles**: `STUDENT`, `TEACHER`, `ADMIN`, `SUPERADMIN`

### 2. Login User to Specific Portal
```
Method: POST
URL: http://localhost:5000/api/auth/login?role=student
Body (JSON):
{
  "email": "student@example.com",
  "password": "test1234"
}
```

### 3. Access Role-Specific Dashboards
```
Method: GET
URL: http://localhost:5000/api/auth/student/dashboard
Headers: Cookie will be set automatically after login
```

### 4. Get User Info (Protected Route)
```
Method: GET
URL: http://localhost:5000/api/user/me
Headers: Cookie will be set automatically after login
```

### 5. Logout
```
Method: POST
URL: http://localhost:5000/api/auth/logout
```

## ✅ Expected Responses

### Register Success (201):
```json
{
  "message": "Registered successfully",
  "user": {
    "id": "clx123abc456...",
    "email": "student@example.com",
    "role": "STUDENT"
  }
}
```

### Login Success (200):
```json
{
  "message": "Login successful",
  "user": {
    "id": "clx123abc456...",
    "email": "student@example.com",
    "role": "STUDENT"
  }
}
```

### Student Dashboard Access (200):
```json
"Welcome student"
```

### User Info (200):
```json
{
  "message": "You are authenticated",
  "user": {
    "id": "clx123abc456...",
    "email": "student@example.com",
    "role": "STUDENT",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## 🚨 Error Responses

### 401 Unauthorized:
```json
{
  "error": "No token provided"
}
```

### 403 Forbidden (Wrong Role):
```json
{
  "error": "Forbidden: Role not authorized"
}
```

### 403 Forbidden (Wrong Portal):
```json
{
  "error": "Access denied for student portal"
}
```

### 400 Bad Request:
```json
{
  "error": "Email, password, and role are required"
}
```

## 🔑 Role-Based Access Control

| Route | STUDENT | TEACHER | ADMIN | SUPERADMIN |
|-------|---------|---------|-------|------------|
| `/api/auth/student/dashboard` | ✅ | ❌ | ❌ | ❌ |
| `/api/auth/teacher/dashboard` | ❌ | ✅ | ❌ | ❌ |
| `/api/auth/admin` | ❌ | ❌ | ✅ | ✅ |
| `/api/user/me` | ✅ | ✅ | ✅ | ✅ |

## 🎯 Test Scenarios

1. **Register as Student** → Login to student portal → Access student dashboard ✅
2. **Register as Teacher** → Login to teacher portal → Access teacher dashboard ✅
3. **Try to access teacher dashboard with student account** → Should get 403 Forbidden ❌
4. **Try to login student to teacher portal** → Should get 403 Access denied ❌
