# Interactive Globe Widget 2 - Secure Version

An interactive 3D globe widget displaying university programs worldwide with secure backend API integration. This version separates frontend rendering from backend data to protect university application links and ensure only authenticated users can access program details.

## 🌟 Features

- **3D Interactive Globe**: Three.js-powered globe with neural network visualization
- **University Program Cubes**: Clickable cubes representing universities across 8 countries
- **Secure Backend**: All university data and application links protected behind authentication
- **Cube Explosion Animation**: Interactive cube clusters that expand to show program details
- **Real-time Connections**: Animated arcs connecting countries with shader effects
- **Program Filtering**: Filter by UG, PG, Mobility, Research, and other program types
- **Authentication Required**: Only logged-in users can interact with cubes and access apply links

## 🏗️ Architecture

### Backend (Node.js/Express)
- **Secure API**: Serves university data only to authenticated users
- **Data Protection**: All application URLs concealed from frontend
- **Authentication**: JWT-based user verification
- **Countries Covered**: Europe, Thailand, Canada, UK, USA, India, Singapore, Malaysia

### Frontend (Three.js/JavaScript)
- **3D Rendering**: Interactive globe with orbital controls
- **Real-time Animation**: Moving neural nodes and connection paths
- **User Interface**: Navigation controls, info panels, and filtering
- **Responsive Design**: Works across desktop and mobile devices

## 🚀 Deployment on Render

This project is designed for easy deployment on Render without local Node.js installation.

### Backend Service
1. **Create Web Service** in Render
2. **Repository**: Connect to this GitHub repo
3. **Settings**:
   - Root Directory: `.`
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Environment: Node

### Frontend Service  
1. **Create Static Site** in Render
2. **Repository**: Same GitHub repo (separate service)
3. **Settings**:
   - Root Directory: `.`
   - Build Command: (leave empty)
   - Publish Directory: `./`

### Environment Variables
Set these in your Render backend service:
- `JWT_SECRET`: Your secret key for authentication
- `NODE_ENV`: `production`

## 📁 File Structure

