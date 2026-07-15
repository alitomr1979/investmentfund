# Functional Requirements Document (FRD): Family Investment Fund App

## 1. Problem Statement
The objective is to build a web application to manage a family and friends investment fund. **Crucially, the purpose of this application is purely accounting and administrative, not trading performance analysis.** It implements the Net Asset Value (NAV) method to rigorously track investor capital inflows/outflows, calculate how many units (shares) each person owns, and automatically process the fund manager's performance commissions using a High Water Mark (HWM) method relative to the S&P 500 benchmark (SPY ETF).

## 2. Proposed Architecture
To ensure scalability, precision in financial calculations, and ease of deployment, the following architecture is recommended:

*   **Frontend (User & Admin Portals):** **Next.js (React)** or **Vue.js**. These provide robust frameworks for building fast, responsive data dashboards. Next.js is highly recommended.
*   **Backend (API & Business Logic):** **Python with FastAPI**. Python is the industry standard for quantitative finance and data manipulation. We will leverage `pandas` for efficient High Water Mark and NAV calculations, and the `yfinance` library to fetch historical ETF data (SPY) at no cost. FastAPI ensures high performance and automatic API documentation.
*   **Database:** **PostgreSQL**. A relational database is absolutely mandatory for financial applications to guarantee ACID compliance (ensuring data integrity for transactions, balances, and audit trails).
*   **Hosting/Deployment:** **Dockerized Environment**. The entire application (Frontend, Backend, and PostgreSQL Database) will be containerized using `Dockerfile`s and orchestrated with `docker-compose`. This ensures the app can run easily on a local machine and is completely portable to any cloud provider (AWS, GCP, Azure, DigitalOcean) in the future.

## 3. Functional Requirements

### 3.1. Net Asset Value (NAV) & Unit Accounting
*   **Initialization:** The fund starts with an initial balance and an initial unit price (e.g., $100.00/unit).
*   **Manual NAV Updates:** The admin manually inputs the total value of the fund. **Important:** The system must enforce that the total fund value is updated *immediately prior* to registering any new deposit or withdrawal to ensure accurate unit pricing. When the total value updates, the NAV per unit is recalculated (Total Value / Total Outstanding Units).
*   **Unit Allocation:** When a user deposits funds, they are allocated units based on the *current* NAV per unit.
*   **Unit Deallocation:** When a user withdraws, units are deducted based on the *current* NAV per unit.

### 3.2. User Management (Admin Role)
*   **Creation:** The Administrator can create, read, update, and delete user accounts (investors).
*   **Roles:** Differentiate between "Admin/Manager" and "Investor" views.

### 3.3. Transaction Management
*   **Deposits & Withdrawals:** Forms to input capital inflows/outflows for specific users.
*   **Date & Timestamping:** The system must record both the "Effective Date" (indicated by the user for when the transaction took place) and the "System Timestamp" (exact time the record was created in the database) for precise reporting and auditing.
*   **Ledger:** A robust transaction table recording the unit price at the time of execution, the quantity of units transacted, and the total fiat value.

### 3.4. Performance Fees & High Water Mark (HWM)
*   **Manager Account:** A specialized user account for the fund manager to receive fee payouts in the form of fund units.
*   **Management Fee:** 0% fixed management fee. Compensation is strictly performance-based.
*   **S&P 500 Benchmarking:** The backend will fetch the monthly performance of the **SPY ETF** using the `yfinance` library.
*   **HWM Logic:**
    1.  Fees are evaluated periodically (e.g., monthly).
    2.  The system checks if the fund's return exceeds the SPY return for the same period.
    3.  The system ensures the current NAV per unit is above the historical High Water Mark (the highest previous NAV at which performance fees were last taken).
    4.  If conditions are met, a performance fee is calculated on the *excess* profits (profits above the SPY benchmark).
    5.  **Configurable Fee Percentage:** The performance fee percentage is configurable per client (defaulting to 50% of the excess).
*   **Fee Deduction:** The calculated fee is deducted by proportionally reducing the units held by the investors and granting those units to the manager's account. This prevents the overall NAV from dropping artificially due to fee payouts.
*   **Fee Ledger:** A dedicated database table to log all commission events, detailing the exact calculation variables (Old NAV, New NAV, SPY Return, Excess Return, Units Transferred) for complete transparency to investors.

### 3.5. Reporting & Dashboards
*   **Admin Dashboard:** Overview of total AUM (Assets Under Management), total units outstanding, global NAV per unit, and historical fund performance.
*   **Investor Dashboard:** Individual view of their fiat balance, unit holdings, deposit/withdrawal history, and a clear, auditable breakdown of commissions paid.
