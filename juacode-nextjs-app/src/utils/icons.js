import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';

// Prevent Font Awesome from dynamically adding its CSS since we're manually adding the CSS file
config.autoAddCss = false;

// Import only the icons we need
import {
  faTrash,
  faEllipsisV,
  faTimes,
  faUser,
  faSignInAlt,
  faCog,
  faSun,
  faMoon,
  faUserCircle,
  faPen,
  faBars,
  faPlus,
  faShare,
  faSignOutAlt,
  faSyncAlt,
  faCheck,
  faArrowLeft,
  faEnvelope,
  faIdCard,
  faCalendarAlt,
} from '@fortawesome/free-solid-svg-icons';

// Export all icons
export const icons = {
  faTrash,
  faEllipsisV,
  faTimes,
  faUser,
  faSignInAlt,
  faCog,
  faSun,
  faMoon,
  faUserCircle,
  faPen,
  faBars,
  faPlus,
  faShare,
  faSignOutAlt,
  faSyncAlt,
  faCheck,
  faArrowLeft,
  faEnvelope,
  faIdCard,
  faCalendarAlt,
}; 