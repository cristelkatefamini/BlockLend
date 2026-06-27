const ROUTE_TITLES = {
  '/': { guest: 'Sign In', auth: 'Home' },
  '/register': 'Register',
  '/verify-email': 'Verify Email',
  '/about': 'About',
  '/home': 'Dashboard',
  '/assets': 'Assets',
  '/borrow-history': 'Borrow History',
  '/transactions': 'Transactions',
  '/profile': 'My Profile',
  '/admin/dashboard': 'Admin Dashboard',
  '/admin/borrow-requests': 'Borrow Requests',
  '/admin/assets': 'Assets Management',
  '/admin/users': 'Users Management',
  '/admin/blockchain': 'Blockchain Transactions',
};

export function getPageTitle(pathname, isAuthenticated = false) {
  const entry = ROUTE_TITLES[pathname];

  if (!entry) {
    return 'BlockLend';
  }

  if (typeof entry === 'object') {
    return `BlockLend | ${isAuthenticated ? entry.auth : entry.guest}`;
  }

  return `BlockLend | ${entry}`;
}
