-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "ts" DATETIME NOT NULL,
    "earnsDollarDaysThisWindow" BOOLEAN NOT NULL,
    CONSTRAINT "Contribution_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "windowStart" DATETIME NOT NULL,
    "windowEnd" DATETIME NOT NULL,
    "profitTotal" REAL NOT NULL,
    "realizedProfit" REAL NOT NULL,
    "unrealizedPnl" REAL NOT NULL,
    CONSTRAINT "Snapshot_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
