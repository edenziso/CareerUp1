# API Documentation

## Overview
This document provides detailed specifications for the API endpoints available in the CareerUp1 application. Each endpoint includes methods, paths, parameters, and examples.

## Authentication
- All endpoints require an authentication token.

## Endpoints

### 1. Get User Profile
- **Method**: GET
- **Path**: `/api/users/{id}`
- **Parameters**:
  - `id`: The ID of the user (path parameter)
- **Response**:
  ```json
  {
    "id": "1",
    "name": "John Doe",
    "email": "john.doe@example.com"
  }
  ```
- **Example**:
  ```http
  GET /api/users/1 HTTP/1.1
  Authorization: Bearer YOUR_TOKEN
  ```

### 2. Create Job Listing
- **Method**: POST
- **Path**: `/api/jobs`
- **Request Body**:
  ```json
  {
    "title": "Software Engineer",
    "description": "Job description here.",
    "company": "Company Name"
  }
  ```
- **Response**:
  ```json
  {
    "id": "101",
    "title": "Software Engineer",
    "company": "Company Name"
  }
  ```
- **Example**:
  ```http
  POST /api/jobs HTTP/1.1
  Authorization: Bearer YOUR_TOKEN
  Content-Type: application/json

  {
    "title": "Software Engineer",
    "description": "Job description here.",
    "company": "Company Name"
  }
  ```

### 3. Apply for Job
- **Method**: POST
- **Path**: `/api/jobs/{id}/apply`
- **Parameters**:
  - `id`: The ID of the job (path parameter)
- **Request Body**:
  ```json
  {
    "userId": "1",
    "resume": "link_to_resume"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Application submitted successfully."
  }
  ```
- **Example**:
  ```http
  POST /api/jobs/101/apply HTTP/1.1
  Authorization: Bearer YOUR_TOKEN
  Content-Type: application/json

  {
    "userId": "1",
    "resume": "link_to_resume"
  }
  ```

## Error Codes
- **400 Bad Request**: Invalid data provided.
- **401 Unauthorized**: Authentication failed.

## Conclusion
This documentation provides a comprehensive overview of the API endpoints. For further questions, please refer to the support team.