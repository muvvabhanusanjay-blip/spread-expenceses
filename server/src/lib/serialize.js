export function serializeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    currency: user.currency,
    isDemo: Boolean(user.isDemo),
    createdAt: user.createdAt,
  };
}

export function serializeAccount(account, extra = {}) {
  return {
    id: account._id.toString(),
    name: account.name,
    type: account.type,
    institution: account.institution || '',
    last4: account.last4 || '',
    color: account.color,
    openingBalance: account.openingBalance,
    isArchived: Boolean(account.isArchived),
    ...extra,
  };
}

export function accountRef(account) {
  if (!account) return null;
  return {
    id: account._id.toString(),
    name: account.name,
    type: account.type,
    last4: account.last4 || '',
    color: account.color,
  };
}

export function serializeTransaction(tx) {
  return {
    id: tx._id.toString(),
    type: tx.type,
    amount: tx.amount,
    category: tx.category,
    merchant: tx.merchant || '',
    note: tx.note || '',
    date: tx.date,
    tags: tx.tags || [],
    account: accountRef(tx.account),
    toAccount: accountRef(tx.toAccount),
    createdAt: tx.createdAt,
  };
}
