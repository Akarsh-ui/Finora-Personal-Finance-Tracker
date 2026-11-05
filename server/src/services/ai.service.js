import { GoogleGenAI } from '@google/genai';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import User from '../models/User.js';

const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Format currency amount with commas and symbol
 */
function formatAmount(amount, symbol) {
  const num = Number(amount || 0);
  return `${symbol}${num.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}`;
}

/**
 * Builds comprehensive, read-only financial context strictly scoped to the authenticated user
 */
export async function buildFinancialContext(userId) {
  const user = await User.findById(userId).select('name email currency');
  if (!user) {
    throw new Error('User account not found');
  }

  const currencyCode = user.currency || 'INR';
  const symbol = CURRENCY_SYMBOLS[currencyCode] || '₹';

  // Retrieve user's transactions (strictly scoped to user)
  const transactions = await Transaction.find({ user: userId })
    .sort({ date: -1 })
    .limit(300)
    .lean();

  // Retrieve user's budgets (strictly scoped to user)
  const budgets = await Budget.find({ user: userId })
    .sort({ year: -1, month: -1 })
    .lean();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Last month calculation
  let lastMonth = currentMonth - 1;
  let lastMonthYear = currentYear;
  if (lastMonth === 0) {
    lastMonth = 12;
    lastMonthYear = currentYear - 1;
  }

  // Aggregate metrics
  let totalIncomeAllTime = 0;
  let totalExpenseAllTime = 0;

  // Monthly buckets: key = 'YYYY-M'
  const monthlyData = {};

  for (const t of transactions) {
    const tDate = new Date(t.date);
    const mKey = `${tDate.getFullYear()}-${tDate.getMonth() + 1}`;

    if (!monthlyData[mKey]) {
      monthlyData[mKey] = {
        year: tDate.getFullYear(),
        month: tDate.getMonth() + 1,
        monthName: MONTH_NAMES[tDate.getMonth()],
        income: 0,
        expense: 0,
        categories: {},
        transactionsCount: 0,
      };
    }

    const amt = Number(t.amount || 0);
    const cat = t.category || 'Other';

    if (t.type === 'income') {
      totalIncomeAllTime += amt;
      monthlyData[mKey].income += amt;
    } else if (t.type === 'expense') {
      totalExpenseAllTime += amt;
      monthlyData[mKey].expense += amt;
      monthlyData[mKey].categories[cat] = (monthlyData[mKey].categories[cat] || 0) + amt;
    }

    monthlyData[mKey].transactionsCount += 1;
  }

  const currentKey = `${currentYear}-${currentMonth}`;
  const lastKey = `${lastMonthYear}-${lastMonth}`;

  const currentMonthData = monthlyData[currentKey] || {
    year: currentYear,
    month: currentMonth,
    monthName: MONTH_NAMES[currentMonth - 1],
    income: 0,
    expense: 0,
    categories: {},
    transactionsCount: 0,
  };

  const lastMonthData = monthlyData[lastKey] || {
    year: lastMonthYear,
    month: lastMonth,
    monthName: MONTH_NAMES[lastMonth - 1],
    income: 0,
    expense: 0,
    categories: {},
    transactionsCount: 0,
  };

  // Top spending categories current month
  const currentCategoriesSorted = Object.entries(currentMonthData.categories || {})
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => {
      const pct =
        currentMonthData.expense > 0
          ? ((amt / currentMonthData.expense) * 100).toFixed(1)
          : '0';
      return `- ${cat}: ${formatAmount(amt, symbol)} (${pct}% of monthly expenses)`;
    });

  // Top spending categories last month
  const lastCategoriesSorted = Object.entries(lastMonthData.categories || {})
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => {
      const pct =
        lastMonthData.expense > 0
          ? ((amt / lastMonthData.expense) * 100).toFixed(1)
          : '0';
      return `- ${cat}: ${formatAmount(amt, symbol)} (${pct}% of monthly expenses)`;
    });

  // Current budgets analysis
  const budgetAnalysis = budgets.map((b) => {
    // Find expenses in this budget's category for the budget's month and year
    const spent = transactions
      .filter((t) => {
        const td = new Date(t.date);
        return (
          t.type === 'expense' &&
          td.getFullYear() === b.year &&
          td.getMonth() + 1 === b.month &&
          t.category?.toLowerCase() === b.category?.toLowerCase()
        );
      })
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const limit = Number(b.monthlyLimit || 0);
    const remaining = limit - spent;
    const utilizationPct = limit > 0 ? ((spent / limit) * 100).toFixed(1) : '0';
    let status = 'Under Budget (Healthy)';
    if (spent >= limit) {
      status = 'EXCEEDED (Over Budget)';
    } else if (spent >= limit * 0.8) {
      status = 'WARNING (Over 80% Limit)';
    }

    return {
      category: b.category,
      monthName: MONTH_NAMES[b.month - 1],
      year: b.year,
      limitFormatted: formatAmount(limit, symbol),
      spentFormatted: formatAmount(spent, symbol),
      remainingFormatted: formatAmount(remaining, symbol),
      utilizationPct: `${utilizationPct}%`,
      status,
      isCurrentPeriod: b.month === currentMonth && b.year === currentYear,
    };
  });

  // Recent transactions list (last 25)
  const recentTransactionsSummary = transactions.slice(0, 25).map((t) => {
    const d = new Date(t.date);
    const dateStr = d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    return `- ${dateStr} | ${t.type.toUpperCase()}: ${formatAmount(
      t.amount,
      symbol
    )} | Category: ${t.category} | Description: "${t.title || t.description || 'N/A'}"`;
  });

  // Historical 6-month list
  const historicalMonths = Object.values(monthlyData)
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    })
    .slice(0, 6)
    .map((m) => {
      const net = m.income - m.expense;
      const rate = m.income > 0 ? ((net / m.income) * 100).toFixed(0) : '0';
      return `- ${m.monthName} ${m.year}: Income ${formatAmount(
        m.income,
        symbol
      )}, Expenses ${formatAmount(m.expense, symbol)}, Net Savings ${formatAmount(
        net,
        symbol
      )} (${rate}% savings rate across ${m.transactionsCount} transactions)`;
    });

  const netBalanceAllTime = totalIncomeAllTime - totalExpenseAllTime;
  const currentMonthNet = currentMonthData.income - currentMonthData.expense;
  const currentSavingsRate =
    currentMonthData.income > 0
      ? ((currentMonthNet / currentMonthData.income) * 100).toFixed(1)
      : '0';

  const lastMonthNet = lastMonthData.income - lastMonthData.expense;
  const lastSavingsRate =
    lastMonthData.income > 0
      ? ((lastMonthNet / lastMonthData.income) * 100).toFixed(1)
      : '0';

  return {
    userName: user.name,
    userEmail: user.email,
    currencyCode,
    symbol,
    totalTransactionsCount: transactions.length,
    netBalanceAllTimeFormatted: formatAmount(netBalanceAllTime, symbol),
    totalIncomeAllTimeFormatted: formatAmount(totalIncomeAllTime, symbol),
    totalExpenseAllTimeFormatted: formatAmount(totalExpenseAllTime, symbol),
    currentMonth: {
      name: MONTH_NAMES[currentMonth - 1],
      year: currentYear,
      incomeFormatted: formatAmount(currentMonthData.income, symbol),
      expenseFormatted: formatAmount(currentMonthData.expense, symbol),
      netSavingsFormatted: formatAmount(currentMonthNet, symbol),
      savingsRatePct: `${currentSavingsRate}%`,
      categories: currentCategoriesSorted,
      count: currentMonthData.transactionsCount,
    },
    lastMonth: {
      name: MONTH_NAMES[lastMonth - 1],
      year: lastMonthYear,
      incomeFormatted: formatAmount(lastMonthData.income, symbol),
      expenseFormatted: formatAmount(lastMonthData.expense, symbol),
      netSavingsFormatted: formatAmount(lastMonthNet, symbol),
      savingsRatePct: `${lastSavingsRate}%`,
      categories: lastCategoriesSorted,
      count: lastMonthData.transactionsCount,
    },
    historicalMonths,
    budgets: budgetAnalysis,
    recentTransactions: recentTransactionsSummary,
  };
}

/**
 * Deterministic financial question-answering logic based on exact MongoDB data.
 * Guarantees exact, truthful answers for financial queries even when external AI API is throttled or offline.
 */
export function calculateDeterministicFinancialAnswer(ctx, query) {
  const q = (query || '').toLowerCase().trim();

  // 1. Monthly spending / expenses
  if (
    q.includes('spend this month') ||
    q.includes('spending this month') ||
    q.includes('expenses this month') ||
    q.includes('how much did i spend') ||
    q.includes('how much have i spent') ||
    q.includes('my spending') ||
    q.includes('monthly expense') ||
    q.includes('monthly spending') ||
    q.includes('what did i spend')
  ) {
    const categoriesText =
      ctx.currentMonth.categories.length > 0
        ? ctx.currentMonth.categories.join('\n')
        : '- No categorized expenses recorded for this month yet.';

    return `### Monthly Spending Summary (${ctx.currentMonth.name} ${ctx.currentMonth.year})
- **Total Expenses:** ${ctx.currentMonth.expenseFormatted} across ${ctx.currentMonth.count} transactions.
- **Total Income:** ${ctx.currentMonth.incomeFormatted}
- **Net Savings:** ${ctx.currentMonth.netSavingsFormatted} (Savings Rate: **${ctx.currentMonth.savingsRatePct}**)

**Category Breakdown:**
${categoriesText}

*Compared to last month (${ctx.lastMonth.name} ${ctx.lastMonth.year}):* You spent ${ctx.lastMonth.expenseFormatted} with a savings rate of ${ctx.lastMonth.savingsRatePct}.`;
  }

  // 2. Highest spending category
  if (
    q.includes('highest spending') ||
    q.includes('top spending') ||
    q.includes('biggest expense') ||
    q.includes('where do i spend most') ||
    q.includes('most expensive category') ||
    q.includes('most spending')
  ) {
    if (ctx.currentMonth.categories.length === 0) {
      return `### Spending Category Analysis (${ctx.currentMonth.name} ${ctx.currentMonth.year})
You have not recorded any expenses for ${ctx.currentMonth.name} yet. Once you add transactions, your highest spending category will be highlighted here.`;
    }

    const topCategoryLine = ctx.currentMonth.categories[0];
    return `### Highest Spending Category (${ctx.currentMonth.name} ${ctx.currentMonth.year})
Your highest spending category this month is **${topCategoryLine.replace(/^- /, '')}**.

**Full Category Breakdown for ${ctx.currentMonth.name}:**
${ctx.currentMonth.categories.join('\n')}`;
  }

  // 3. Compare income and expenses / cash flow
  if (
    q.includes('compare') ||
    q.includes('income vs expense') ||
    q.includes('income and expense') ||
    q.includes('cash flow') ||
    q.includes('how much income') ||
    q.includes('total income')
  ) {
    return `### Income vs. Expenses Comparison (${ctx.currentMonth.name} ${ctx.currentMonth.year})
- **Total Income:** ${ctx.currentMonth.incomeFormatted}
- **Total Expenses:** ${ctx.currentMonth.expenseFormatted}
- **Net Cash Flow / Savings:** ${ctx.currentMonth.netSavingsFormatted}
- **Current Savings Rate:** **${ctx.currentMonth.savingsRatePct}**

**Previous Month Reference (${ctx.lastMonth.name} ${ctx.lastMonth.year}):**
- **Income:** ${ctx.lastMonth.incomeFormatted}
- **Expenses:** ${ctx.lastMonth.expenseFormatted}
- **Net Savings:** ${ctx.lastMonth.netSavingsFormatted} (Savings Rate: ${ctx.lastMonth.savingsRatePct})`;
  }

  // 4. Budgets & limits
  if (
    q.includes('budget') ||
    q.includes('staying within') ||
    q.includes('over budget') ||
    q.includes('remaining budget') ||
    q.includes('budget limit') ||
    q.includes('utilization')
  ) {
    if (ctx.budgets.length === 0) {
      return `### Budget Status
You currently have no budgets configured in Finora.
To establish spending limits and monitor budget utilization, go to the **Budgets** section in the sidebar.`;
    }

    const budgetLines = ctx.budgets
      .map(
        (b) =>
          `- **${b.category}** (${b.monthName} ${b.year}): Spent ${b.spentFormatted} of ${b.limitFormatted} limit (**${b.utilizationPct}** utilized). Remaining: ${b.remainingFormatted}. Status: **${b.status}**`
      )
      .join('\n');

    return `### Budget Utilization & Spending Limits
Here is the status of your configured budgets:

${budgetLines}

*Tip:* When you exceed 80% of a budget limit, Finora automatically flags a warning to help you avoid overspending.`;
  }

  // 5. Spending trends / historical / 3 months
  if (
    q.includes('trend') ||
    q.includes('three month') ||
    q.includes('3 month') ||
    q.includes('last three') ||
    q.includes('history') ||
    q.includes('historical') ||
    q.includes('past month')
  ) {
    const historyLines =
      ctx.historicalMonths.length > 0
        ? ctx.historicalMonths.join('\n')
        : '- No multi-month history recorded yet.';

    return `### Financial Trends & Historical Summary
Here is your recent monthly financial trajectory:

${historyLines}

**All-Time Finora Portfolio Overview:**
- **Total Recorded Transactions:** ${ctx.totalTransactionsCount}
- **All-Time Income:** ${ctx.totalIncomeAllTimeFormatted}
- **All-Time Expenses:** ${ctx.totalExpenseAllTimeFormatted}
- **Net Lifetime Balance:** **${ctx.netBalanceAllTimeFormatted}**`;
  }

  // 6. Balance / net worth / overall money
  if (
    q.includes('balance') ||
    q.includes('net worth') ||
    q.includes('how much money') ||
    q.includes('total balance') ||
    q.includes('current balance')
  ) {
    return `### Account Balance & Position
- **Net Balance (All-Time Cash Flow):** **${ctx.netBalanceAllTimeFormatted}**
- **Total Income Recorded:** ${ctx.totalIncomeAllTimeFormatted}
- **Total Expenses Recorded:** ${ctx.totalExpenseAllTimeFormatted}
- **Current Month Net:** ${ctx.currentMonth.netSavingsFormatted} (${ctx.currentMonth.name} ${ctx.currentMonth.year})`;
  }

  // 7. Reducing expenses / saving money advice
  if (
    q.includes('reduce') ||
    q.includes('cut') ||
    q.includes('save more') ||
    q.includes('unnecessary') ||
    q.includes('advice') ||
    q.includes('tips')
  ) {
    const topCategories = ctx.currentMonth.categories.slice(0, 3);
    const topAdvice =
      topCategories.length > 0
        ? topCategories.map((c) => `- ${c}`).join('\n')
        : '- Add more transactions to identify recurring discretionary categories.';

    return `### Actionable Expense Optimization
Based on your actual verified records in Finora:
- **Current Month Outflow:** ${ctx.currentMonth.expenseFormatted} across ${ctx.currentMonth.count} transactions.
- **Current Savings Rate:** ${ctx.currentMonth.savingsRatePct}

**Top Expense Areas to Review:**
${topAdvice}

**Recommendations:**
1. **Target Discretionary Categories:** Review discretionary spending in your highest category. Reducing this by even 10-15% can substantially boost your savings rate.
2. **Set Monthly Limits:** Create strict budgets in the Budgets section for variable categories so you receive real-time threshold alerts.
3. **Automate Savings:** Allocate savings immediately upon receiving income rather than saving whatever remains at the end of the month.`;
  }

  // Default snapshot fallback
  return `### Finora Financial Snapshot for ${ctx.userName}
Here is a summary of your current financial standing:

- **Current Month (${ctx.currentMonth.name} ${ctx.currentMonth.year}):** Income: ${ctx.currentMonth.incomeFormatted} | Expenses: ${ctx.currentMonth.expenseFormatted} | Net: ${ctx.currentMonth.netSavingsFormatted} (Savings Rate: **${ctx.currentMonth.savingsRatePct}**)
- **Lifetime Balance:** **${ctx.netBalanceAllTimeFormatted}** across ${ctx.totalTransactionsCount} recorded transactions.
- **Active Budgets:** ${ctx.budgets.length} configured in your account.

You can ask me specific questions at any time, such as:
- *"How much did I spend this month?"*
- *"What is my highest spending category?"*
- *"Am I staying within my budgets?"*
- *"Compare my income and expenses this month"*
- *"Show my spending trends over the last three months"*`;
}

/**
 * Generate AI chat response using official @google/genai SDK with deterministic fallback
 * @param {string} userId - Authenticated user ID
 * @param {string} userMessage - User query text
 * @param {Array<{ role: string, text: string }>} conversationHistory - Prior conversation turns
 */
export async function generateFinancialChatResponse(userId, userMessage, conversationHistory = []) {
  const apiKey = process.env.GEMINI_API_KEY;

  // 1. Gather real financial data belonging to the authenticated user from MongoDB
  const ctx = await buildFinancialContext(userId);

  // If no API key configured, seamlessly answer using verified MongoDB data
  if (
    !apiKey ||
    apiKey === 'MY_GEMINI_API_KEY' ||
    apiKey === 'YOUR_GEMINI_API_KEY' ||
    apiKey.trim() === ''
  ) {
    const deterministicReply = calculateDeterministicFinancialAnswer(ctx, userMessage);
    return {
      success: true,
      configured: false,
      reply: deterministicReply,
      model: 'Finora Financial Intelligence (Deterministic Engine)',
    };
  }

  // 2. Build structured system instruction
  const systemInstruction = `You are the Finora AI Financial Assistant, an intelligent, objective, and supportive personal wealth advisor embedded within the Finora Personal Finance Tracker.
Your role is to help ${ctx.userName} understand their financial health, spending patterns, budgets, income, expenses, cash flow, and savings.

HERE IS THE AUTHENTICATED USER'S REAL FINANCIAL DATA (Strict source of truth from MongoDB):
User: ${ctx.userName} (${ctx.userEmail})
Preferred Currency: ${ctx.currencyCode} (Use symbol: ${ctx.symbol})
Total Recorded Transactions in Finora: ${ctx.totalTransactionsCount}
Overall Net Balance / Lifetime Cash Flow: ${ctx.netBalanceAllTimeFormatted} (Total Income: ${ctx.totalIncomeAllTimeFormatted}, Total Expenses: ${ctx.totalExpenseAllTimeFormatted})

CURRENT MONTH (${ctx.currentMonth.name} ${ctx.currentMonth.year}):
- Income: ${ctx.currentMonth.incomeFormatted}
- Expenses: ${ctx.currentMonth.expenseFormatted}
- Net Savings: ${ctx.currentMonth.netSavingsFormatted}
- Savings Rate: ${ctx.currentMonth.savingsRatePct}
- Total Transactions: ${ctx.currentMonth.count}
- Expense Categories Breakdown:
${ctx.currentMonth.categories.length > 0 ? ctx.currentMonth.categories.join('\n') : '- No expenses recorded for this month yet.'}

LAST MONTH (${ctx.lastMonth.name} ${ctx.lastMonth.year}):
- Income: ${ctx.lastMonth.incomeFormatted}
- Expenses: ${ctx.lastMonth.expenseFormatted}
- Net Savings: ${ctx.lastMonth.netSavingsFormatted}
- Savings Rate: ${ctx.lastMonth.savingsRatePct}
- Total Transactions: ${ctx.lastMonth.count}
- Expense Categories Breakdown:
${ctx.lastMonth.categories.length > 0 ? ctx.lastMonth.categories.join('\n') : '- No expenses recorded for last month.'}

HISTORICAL MONTHLY SUMMARY (Recent 6 Months):
${ctx.historicalMonths.length > 0 ? ctx.historicalMonths.join('\n') : '- No historical data available.'}

SAVED BUDGETS & SPENDING LIMITS:
${
  ctx.budgets.length > 0
    ? ctx.budgets
        .map(
          (b) =>
            `- [${b.monthName} ${b.year}] ${b.category}: Limit ${b.limitFormatted} | Spent: ${b.spentFormatted} (${b.utilizationPct}) | Remaining: ${b.remainingFormatted} | Status: ${b.status}`
        )
        .join('\n')
    : '- No budgets set by user yet.'
}

RECENT TRANSACTIONS (Latest 25 records):
${ctx.recentTransactions.length > 0 ? ctx.recentTransactions.join('\n') : '- No transactions recorded.'}

CORE BEHAVIOR RULES:
1. Base all numerical answers strictly on the authenticated user's actual data above. Never invent, hallucinate, or estimate numbers, dates, transactions, or budgets that do not exist in the data.
2. Always format money values using the user's currency symbol (${ctx.symbol}).
3. Be clear, polite, natural, and conversational. Use readable formatting with short paragraphs and bullet points where helpful.
4. Explain calculations and percentage comparisons clearly when comparing months or analyzing spending changes.
5. If the user asks about a time period, category, or transaction for which no data exists, clearly state that no records were found for that period in their Finora account.
6. If the user asks something completely unrelated to personal finance or Finora, politely explain your scope as Finora's financial assistant.
7. You are a read-only advisor: you cannot create, edit, or delete transactions or budgets, nor do you have direct access to bank accounts.
8. Provide practical, non-judgmental spending observations and actionable budgeting advice based directly on their actual spending patterns.`;

  // 3. Format conversational contents with history
  const contents = [];
  const safeHistory = Array.isArray(conversationHistory)
    ? conversationHistory.slice(-10)
    : [];

  for (const turn of safeHistory) {
    if (turn && typeof turn.text === 'string' && turn.text.trim()) {
      const role = turn.role === 'model' || turn.role === 'assistant' ? 'model' : 'user';
      contents.push({
        role,
        parts: [{ text: turn.text.trim() }],
      });
    }
  }

  // Append latest user message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage.trim() }],
  });

  // 4. Initialize official GoogleGenAI SDK
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

  try {
    const response = await ai.models.generateContent({
      model: primaryModel,
      contents,
      config: {
        systemInstruction,
      },
    });

    const reply = response.text || 'I apologize, but I could not generate a response. Please try again.';

    return {
      success: true,
      configured: true,
      reply,
      model: primaryModel,
    };
  } catch (error) {
    console.error('[AiService] Primary model error:', error?.message || error);

    const errorMessage = error?.message || String(error);

    // If 503/high demand or 429, attempt fast fallback to gemini-3.1-flash-lite
    if (
      (errorMessage.includes('503') ||
        errorMessage.includes('UNAVAILABLE') ||
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorMessage.includes('429')) &&
      primaryModel !== 'gemini-3.1-flash-lite'
    ) {
      try {
        console.log('[AiService] Attempting fast fallback to gemini-3.1-flash-lite...');
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents,
          config: {
            systemInstruction,
          },
        });
        const reply = fallbackResponse.text;
        if (reply) {
          return {
            success: true,
            configured: true,
            reply,
            model: 'gemini-3.1-flash-lite',
          };
        }
      } catch (fallbackErr) {
        console.warn('[AiService] Fallback model error:', fallbackErr?.message || fallbackErr);
      }
    }

    // Always provide accurate deterministic answers for financial inquiries
    console.log('[AiService] Serving deterministic answer from verified MongoDB records...');
    const deterministicReply = calculateDeterministicFinancialAnswer(ctx, userMessage);

    return {
      success: true,
      configured: true,
      reply: deterministicReply,
      model: 'Finora Financial Intelligence (MongoDB Verified)',
    };
  }
}

