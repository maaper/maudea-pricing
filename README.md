# NAUDEA Pricing Calculator

Web application designed for professional pricing, budget calculations, and import handling, built with Next.js and Prisma. It guarantees correct cost allocation (base costs, structure, risk, margins, corporate tax, legal reserve) to avoid under-priced operations.

## Features
- **Pricing Calculator Engine**: Applies direct costs, overheads, risk premiums, and expected margins to determine the exact target price ensuring long-term profitability and sustainable margins.
- **Import Handling & Tariffs**: Supports splitting custom duties (tariffs) among different products, multi-currency values with live exchange rates.
- **AI Assessment Controller**: Evaluates and suggests pricing improvements or flags inconsistencies automatically.
- **PDF Generation**: Generates clean, professional quotation reports ready to be sent to clients.

## Tech Stack
- Framework: **Next.js 14+** (App Router)
- Language: **TypeScript**
- Styling: **Tailwind CSS**
- Database ORM: **Prisma**
- Database: **SQLite** (can be easily swapped with PostgreSQL)

## Local Development Requirements
- Node.js 18.x or superior.

### Setup locally
1. Clone this repository.
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill the variables.
   ```bash
   cp .env.example .env
   ```
4. Push the schema to set up the SQLite database:
   ```bash
   npx prisma db push
   npx prisma generate
   ```
5. Start development server:
   ```bash
   npm run dev
   ```

## Docker Deployment (NAS/Synology)
Below you can find instructions for deploying the app using `docker-compose.yml`.

1. Create a `.env` file from the `.env.example` mapping it correctly:
   ```env
   DATABASE_URL="file:/app/data/dev.db"
   GEMINI_API_KEY="AI_KEY_HERE"
   # NextAuth variables
   NEXTAUTH_URL="http://your-nas-ip:3000"
   NEXTAUTH_SECRET="some-random-strong-secret"
   ```
2. **Create the Database Folder on your NAS**:
   - Open **File Station** in your Synology interface.
   - Navigate to `/volume1/docker/` (or your primary Docker volume).
   - Create a folder named `naudeapricing` (it must match the docker-compose mapping).
   - Inside that folder, create another folder named `data`. The final path should be exactly `/volume1/docker/naudeapricing/data`.
3. Start the container stack using Container Manager / Portainer, or via SSH:
   ```bash
   docker-compose up -d --build
   ```
The app will bind by default to port `3000`.

## Maintainer
Naudea Deporte Integral S.L. / maant
