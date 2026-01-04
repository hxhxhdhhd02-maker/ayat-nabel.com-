
# Ayat Parent App

This is a dedicated mobile application for Guardians/Parents to track their student's progress.

## Key Features
- **Easy Login:** Log in using the Student's (or Parent's) phone number.
- **Progress Tracking:** View student's grade and status.
- **Financial Wallet:** Track current balance, recharge history, and request status (Approved/Rejected/Pending).
- **Courses:** View enrolled courses.
- **Exams:** View exam results and scores.

## How to Run
1. Navigate to this directory:
   ```bash
   cd parent-mobile
   ```
2. Install dependencies (if not already done):
   ```bash
   npm install
   ```
3. Start the app:
   ```bash
   npx expo start
   ```

## Project Structure
- `src/screens`: Contains `ParentLoginScreen` and `ParentDashboardScreen`.
- `src/components`: Contains the main tabs (`ParentHome`, `ParentWallet`, `ParentCourses`, `ParentExams`).
- `src/contexts`: Contains `ParentContext` for authentication logic.
- `src/lib`: Shared Firebase configuration.
