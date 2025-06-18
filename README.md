# CharityScanner

A web application for viewing and analyzing financial data from the Australian Charities and Not-for-profits Commission (ACNC).

## Deployment to Vercel

This project is set up for deployment on Vercel. Follow these steps to deploy:

1. Install the Vercel CLI:
   ```
   npm install -g vercel
   ```

2. Log in to Vercel:
   ```
   vercel login
   ```

3. Deploy to Vercel:
   ```
   vercel
   ```

### Database Handling on Vercel

The application uses a SQLite database. In the Vercel environment, the database file is copied to the `/tmp` directory, which is the only writable location in Vercel's serverless functions. Make sure your database file is included in your Git repository before deploying.

## Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   npm run dev
   ```

3. Access the application at http://localhost:3000