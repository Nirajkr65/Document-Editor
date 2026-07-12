# Deployment Blueprint Guide

This guide details how to deploy the **CollabSpace** MERN stack real-time collaborative document editor onto **Render** (for the backend server & WebSockets) and **Vercel** (for the Vite + React frontend).

---

## 1. Database Provisioning (MongoDB Atlas)

CollabSpace utilizes MongoDB to persist user profiles, documents, comments, and activity logs.

1. Create a free account or log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new Shared Cluster database (e.g. `collabspace`).
3. Under **Network Access**, add an entry to allow connections from anywhere (`0.0.0.0/0`) since Render's dynamic instances require open access.
4. Under **Database Access**, create a user credentials entry (e.g. username `db_user`) with read/write access.
5. Click **Connect** -> **Connect your application** and copy the connection string. Replace `<password>` with the password you defined.
   - *Example string*: `mongodb+srv://db_user:<password>@cluster0.abcde.mongodb.net/collabspace?retryWrites=true&w=majority`

---

## 2. Backend Deployment on Render

The server contains the Express REST endpoints and Socket.io server.

1. Create a free account or log in to [Render](https://render.com).
2. Click **New +** -> **Blueprint** or **Web Service**.
   - **Using Blueprints (Recommended)**:
     - Connect your GitHub repository containing the codebase.
     - Render will automatically locate the [render.yaml](file:///Users/NIRAJKUMAR/Desktop/Document%20Editor/render.yaml) file in the root directory and configure all services automatically!
   - **Using Web Services manually**:
     - Create a Node Web Service.
     - Set **Root Directory** to `server`.
     - Set **Build Command** to `npm install`.
     - Set **Start Command** to `node server.js`.
3. In both methods, configure the following **Environment Variables** in Render's dashboard:
   - `PORT`: `5001` (or let Render set it dynamically)
   - `MONGO_URI`: `your_mongodb_atlas_connection_string`
   - `JWT_SECRET`: `your_random_jwt_secret_string`
   - `CLOUDINARY_CLOUD_NAME`: `your_cloudinary_cloud_name` (Optional: falls back to mockup upload fallback if omitted)
   - `CLOUDINARY_API_KEY`: `your_cloudinary_api_key` (Optional)
   - `CLOUDINARY_API_SECRET`: `your_cloudinary_api_secret` (Optional)
   - `GEMINI_API_KEY`: `your_gemini_api_key` (Optional: falls back to mockup AI fallback if omitted)
4. Deploy the service and copy the provided Render service URL (e.g. `https://collabspace-api.onrender.com`).

---

## 3. Frontend Deployment on Vercel

The client contains the React UI, rich text editor, cursors, comments, and theme manager.

1. Create a free account or log in to [Vercel](https://vercel.com).
2. Click **Add New** -> **Project** and select your GitHub repository.
3. Configure the Project settings:
   - **Framework Preset**: `Vite` (automatically detected)
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the following **Environment Variables** in Vercel's project dashboard:
   - `VITE_API_URL`: `https://your-render-backend-url.onrender.com/api` (The Render URL copied in step 2 followed by `/api`)
   - `VITE_SOCKET_URL`: `https://your-render-backend-url.onrender.com` (The exact Render URL copied in step 2)
5. Click **Deploy**. Vercel will build the frontend assets, configure routing fallback rules via [vercel.json](file:///Users/NIRAJKUMAR/Desktop/Document%20Editor/client/vercel.json), and host the site.
