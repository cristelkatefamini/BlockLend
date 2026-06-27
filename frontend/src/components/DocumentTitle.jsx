import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPageTitle } from '../utils/pageTitles';

export default function DocumentTitle() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    document.title = getPageTitle(location.pathname, isAuthenticated);
  }, [location.pathname, isAuthenticated]);

  return null;
}
