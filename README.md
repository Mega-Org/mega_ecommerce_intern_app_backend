# Mega Ecommerce Backend

A complete Node.js/Express REST API backend for a Flutter E-commerce application.

> **Live Deployment**
> - **API Base URL**: [https://mega-ecommerce-intern-app-backend.vercel.app](https://mega-ecommerce-intern-app-backend.vercel.app)
> - **Swagger Documentation**: [https://mega155-ecommerce-app-backend.vercel.app/api-docs](https://mega155-ecommerce-app-backend.vercel.app/api-docs)

## 🚀 Features

- **Authentication**: 
  - Login (Email/Password) & Signup (User Data)
  - JWT Authentication
  - Email Verification & Forgot Password (Static code `1234` for dev)
  - Logout & Delete Account
- **User Profile**: 
  - Update Name & Avatar
  - Secure Email & Password Updates
  - **Auto-Avatar Cleanup**: Deleting/Updating avatar removes old file from cloud.
- **Product Management**: 
  - Admin/Owner: Add/Update Products with **Images & Video**.
  - **Smart Media**: 
    - Images auto-converted to **JPG** (max 1080px) for Flutter performance.
    - **Video Support** (`.mp4`) for product previews.
  - **Smart Deletion**:
    - If a product was **Ordered**: Soft Delete (Archived, keeps history).
    - If **Unsold**: Hard Delete (Removes DB entry & destroys Cloudinary files).
- **Cart & Orders**: 
  - Full Cart Management (Add, remove, update qty)
  - Checkout & Order Creation
  - Order History (Preserved even if product/user deleted)
- **Notifications**: System alerts for orders and reviews
- **Static Content**: Privacy, Terms, rate app endpoints

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Storage**: Cloudinary (Images & Videos)
- **Authentication**: JSON Web Tokens (JWT) & bcryptjs
- **Documentation**: Swagger UI

## 📦 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mega_ecommerce_intern_app_backend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Rename `.env.example` to `.env` and add:
   ```env
   PORT=3000
   NODE_ENV=development
   MONGO_URI=your_mongodb_uri
   JWT_SECRET=supersecretkey123
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

4. **Run the Server**
   ```bash
   # Development mode (restarts on changes)
   npm run dev

   # Production mode
   npm start
   ```

## 📖 API Documentation

This project includes Swagger UI for interactive API documentation and testing.

- Local: **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**
- Live: **[https://mega-ecommerce-intern-app-backend.vercel.app/api-docs](https://mega-ecommerce-intern-app-backend.vercel.app/api-docs)**

## 🧪 Testing Notes

- **Verification Code**: Use `1234`.
- **Media Uploads**: 
  - Images (`image`, `images`): Supports PNG/JPG/WebP/etc -> Converts to **JPG**.
  - Video (`video`): Supports MP4/MOV.
- **Auth Header**: `Authorization: Bearer <your_jwt_token>`

## 📂 Project Structure

```
src/
├── config/         # DB & Upload config
├── controllers/    # Route logic
├── docs/           # Swagger setup
├── middleware/     # Auth middleware
├── models/         # Mongoose models
├── routes/         # Express routes
├── utils/          # Helper functions
├── app.js          # App setup
└── server.js       # Entry point
```
