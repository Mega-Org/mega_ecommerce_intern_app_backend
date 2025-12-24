# Mega Ecommerce Backend

A complete Node.js/Express REST API backend for a Flutter E-commerce application.


- **Deployment**:
    - **Live API**: [https://mega-ecommerce-intern-app-backend.vercel.app](https://mega-ecommerce-intern-app-backend.vercel.app)
    - **Documentation**: [https://mega-ecommerce-intern-app-backend.vercel.app/api-docs](https://mega-ecommerce-intern-app-backend.vercel.app/api-docs)
    - **CI/CD**: Auto-deploys from `main` branch via Vercel.

## 🚀 Features

- **Authentication**: 
  - Login (Email/Password) & Signup (User Data)
  - JWT Authentication
  - Email Verification & Forgot Password (Static code `1234` for dev)
  - Logout & Delete Account
- **User Profile**: 
  - Update Name/Avatar
  - Secure Email & Password Updates
- **Product Management**: 
  - Admin/Owner: Add Products
  - User: List (Search + Pagination), Details
  - Reviews & Ratings system
  - Favorites/Wishlist system
- **Cart & Orders**: 
  - Full Cart Management (Add, remove, update qty)
  - Checkout & Order Creation
  - Order History
- **Notifications**: System alerts for orders and reviews
- **Static Content**: Privacy, Terms, rate app endpoints

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
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
   The project comes with a `.env` file (or rename `.env.example`). Ensure your MongoDB URI is correct.
   ```env
   PORT=3000
   NODE_ENV=development
   MONGO_URI=mongodb://localhost:27017/mega_ecommerce
   JWT_SECRET=supersecretkey123
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

一旦 server running (default port 3000):
👉 **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

## 🧪 Testing

- **Verification Code**: For Email Verification and Forgot Password, use the static code `1234`.
- **Auth Header**: Most endpoints require a Bearer Token.
  `Authorization: Bearer <your_jwt_token>`

## 📂 Project Structure

```
src/
├── config/         # Database config
├── controllers/    # Route logic
├── docs/           # Swagger setup
├── middleware/     # Auth middleware
├── models/         # Mongoose models
├── routes/         # Express routes
├── utils/          # Helper functions
├── app.js          # App setup
└── server.js       # Entry point
```
