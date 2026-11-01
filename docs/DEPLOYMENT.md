# Deployment, Operation & Backup Guide

## 1. System Requirements & Prerequisites
- Node.js >= 18.0.0 (Node 20 or 22 LTS recommended)
- MongoDB >= 6.0 (Local MongoDB Community Server or MongoDB Atlas M0/M10+ cluster)
- Process Manager: PM2 (recommended for single-server Node.js deployments) or Docker

---

## 2. Environment Configuration
Copy `.env.example` to `.env` in both root and `server/`:
```bash
cp .env.example server/.env
```

Key environment variables:
| Variable | Description | Production Guidance |
|---|---|---|
| `PORT` | Backend HTTP Port | Default 5000 |
| `NODE_ENV` | Environment mode | `production` |
| `CLIENT_URL` | Frontend origin | `https://your-domain.com` |
| `MONGODB_URI` | MongoDB Connection URI | Use MongoDB Atlas replica set URI with SSL |
| `JWT_SECRET` | Token cryptographic secret | Min 64 random characters (e.g., generated with `openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | Token validity | `7d` or `24h` |
| `INITIAL_ADMIN_NAME` | Bootstrap administrator name | Required only when running `npm run seed:admin` |
| `INITIAL_ADMIN_EMAIL` | Bootstrap administrator email | Required only when running `npm run seed:admin` |
| `INITIAL_ADMIN_PASSWORD` | Bootstrap administrator password | Set a unique strong password; required for seeding |
| `INITIAL_STAFF_NAME` | Bootstrap staff name | Required only when running `npm run seed:admin` |
| `INITIAL_STAFF_EMAIL` | Bootstrap staff email | Required only when running `npm run seed:admin` |
| `INITIAL_STAFF_PASSWORD` | Bootstrap staff password | Set a unique strong password; required for seeding |

---

## 3. Initial Admin Bootstrap
To initialize the system with the first Administrator account without hardcoding credentials in git:
```bash
cd server
npm run seed:admin
```
The script requires all `INITIAL_ADMIN_*` and `INITIAL_STAFF_*` values in the server environment before connecting to the database. It creates the configured accounts and a default location if none exists. It does not supply default passwords, phone numbers, or addresses.

---

## 4. Production Build & Execution

### 4.1 Building the Frontend
```bash
cd client
npm install
npm run build
```
This compiles the React application into optimized static assets in `client/dist`.

### 4.2 Building and Running the Backend
```bash
cd server
npm install
npm run build
npm start
```
Or with PM2:
```bash
pm2 start dist/server.js --name "ladies-wear-api"
pm2 save
pm2 startup
```

---

## 5. Database Backup and Disaster Recovery

### 5.1 Automated Daily Backup Script
```bash
# Export MongoDB collections to timestamped archive
mongodump --uri="mongodb://localhost:27017/ladies_wear_db" --archive="/backups/ladies_wear_$(date +%Y%m%d_%H%M%S).gz" --gzip
```

### 5.2 Restore Procedure
```bash
# Restore from compressed archive
mongorestore --uri="mongodb://localhost:27017/ladies_wear_db" --archive="/backups/ladies_wear_backup_file.gz" --gzip --drop
```
*(The `--drop` flag replaces existing collections with the backup snapshot).*
