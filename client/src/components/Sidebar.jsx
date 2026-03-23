import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    HiOutlineViewGrid, HiOutlineFolder, HiOutlineShieldCheck,
    HiOutlineClipboardList, HiOutlineUserGroup, HiOutlineLogout,
    HiOutlineDocumentReport, HiOutlineLightningBolt
} from 'react-icons/hi';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { to: '/', icon: <HiOutlineViewGrid />, label: 'Dashboard' },
        { to: '/cases', icon: <HiOutlineFolder />, label: 'Cases' },
        { to: '/tasks', icon: <HiOutlineClipboardList />, label: 'Tasks' },
    ];

    if (user?.role === 'admin') {
        navItems.push({ to: '/admin', icon: <HiOutlineUserGroup />, label: 'User Management' });
    }

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">DE</div>
                <div>
                    <div className="sidebar-title">Evidence Manager</div>
                    <div className="sidebar-subtitle">Cyber Forensics</div>
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className="sidebar-section">
                    <div className="sidebar-section-title">Navigation</div>
                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>

            <div className="sidebar-user">
                <div className="sidebar-avatar">
                    {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="sidebar-user-info">
                    <div className="sidebar-user-name">{user?.name}</div>
                    <div className="sidebar-user-role">{user?.role}</div>
                </div>
                <button className="sidebar-logout" onClick={handleLogout} title="Logout">
                    <HiOutlineLogout size={18} />
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
