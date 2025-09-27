import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaRobot, 
  FaChartLine, 
  FaUser, 
  FaHistory, 
  FaCog,
  FaSignOutAlt,
  FaWifi,
  FaExclamationTriangle
} from 'react-icons/fa';
import { RiChatNewFill } from 'react-icons/ri';

const MainDashboard = ({ user, subscription, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/auth');
  };

  const getConnectionStatusColor = () => {
    return '#17bf63'; // Connected
  };

  const getConnectionStatusText = () => {
    return 'Connected';
  };

  const getConnectionIcon = () => {
    return <FaWifi />;
  };

  return (
    <div className="main-dashboard" style={{ 
      width: '380px',
      height: '600px',
      display: 'flex', 
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: '#002550FF',
      overflow: 'hidden',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTouchCallout: 'none',
      touchAction: 'manipulation'
    }}>
      {/* Background Animation */}
      <div className="background-animation">
        <div className="floating-orb dashboard-orb-1"></div>
        <div className="floating-orb dashboard-orb-2"></div>
        <div className="floating-orb dashboard-orb-3"></div>
      </div>

      {/* Header */}
      <div className="dashboard-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '12px 16px',
        borderBottom: '1px solid #8A8A8AFF',
        background: 'linear-gradient(0deg, #002550FF 0%, #764ba2 100%)',
        flexShrink: 0,
        minHeight: '50px'
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 className="dashboard-title" style={{ 
            margin: 0, 
            color: '#FFDCDCFF', 
            fontSize: '16px', 
            fontWeight: '600',
            lineHeight: '20px'
          }}>
            Social Shopping Agent
          </h2>
          <div className="connection-status" style={{ 
            fontSize: '11px', 
            color: getConnectionStatusColor(),
            marginTop: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            lineHeight: '11px'
          }}>
            {getConnectionIcon()}
            <span>{getConnectionStatusText()}</span>
          </div>
        </div>
        
        <div className="header-actions" style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button 
            onClick={() => navigate('/profile')}
            className="header-button"
            style={{ 
              padding: '6px 8px', 
              backgroundColor: 'rgba(255, 220, 220, 0.2)',
              border: '1px solid rgba(255, 220, 220, 0.3)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#FFDCDCFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Profile"
          >
            <FaUser />
          </button>
          
          <button 
            onClick={handleLogout}
            className="header-button"
            style={{ 
              padding: '6px 8px', 
              backgroundColor: 'rgba(255, 220, 220, 0.2)',
              border: '1px solid rgba(255, 220, 220, 0.3)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#FFDCDCFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Logout"
          >
            <FaSignOutAlt />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-content" style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        padding: '16px',
        gap: '16px',
        overflow: 'auto'
      }}>
        
        {/* Welcome Message */}
        <div className="welcome-section" style={{
          textAlign: 'center',
          marginBottom: '12px'
        }}>
          <h3 style={{ 
            color: '#FFDCDCFF', 
            fontSize: '14px', 
            fontWeight: '500',
            margin: '0 0 4px 0'
          }}>
            Welcome back, {user?.name || user?.email || 'User'}!
          </h3>
          <p style={{ 
            color: '#B0B0B0', 
            fontSize: '12px', 
            margin: '0',
            lineHeight: '16px'
          }}>
            Choose your preferred mode to get started
          </p>
        </div>

        {/* Main Action Cards */}
        <div className="action-cards" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          
          {/* Chatbot Card */}
          <div 
            className="action-card chatbot-card"
            onClick={() => navigate('/chat')}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                color: '#FFDCDCFF'
              }}>
                <FaRobot />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ 
                  color: '#FFDCDCFF', 
                  fontSize: '14px', 
                  fontWeight: '600',
                  margin: '0 0 2px 0'
                }}>
                  AI Chatbot
                </h4>
                <p style={{ 
                  color: 'rgba(255, 220, 220, 0.8)', 
                  fontSize: '11px', 
                  margin: '0',
                  lineHeight: '14px'
                }}>
                  Chat with AI agents for web automation, social media, shopping, and more
                </p>
              </div>
            </div>
            
            {/* Example Commands */}
            <div style={{ 
              marginTop: '8px',
              padding: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              fontSize: '10px'
            }}>
              <div style={{ color: '#FFDCDCFF', fontWeight: '500', marginBottom: '4px' }}>
                Try these commands:
              </div>
              <div style={{ color: 'rgba(255, 220, 220, 0.8)', lineHeight: '12px' }}>
                • "Post 'Hello World!' on Twitter"<br/>
                • "Find iPhone 15 on Amazon and add to cart"<br/>
                • "Search for AI tutorials on YouTube"<br/>
                • "Navigate to Gmail and check my inbox"
              </div>
            </div>
          </div>

          {/* Analyze Card - Placeholder for future implementation */}
          <div 
            className="action-card analyze-card"
            style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'not-allowed',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              opacity: '0.6',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                color: '#FFDCDCFF'
              }}>
                <FaChartLine />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ 
                  color: '#FFDCDCFF', 
                  fontSize: '14px', 
                  fontWeight: '600',
                  margin: '0 0 2px 0'
                }}>
                  Review Analysis
                </h4>
                <p style={{ 
                  color: 'rgba(255, 220, 220, 0.8)', 
                  fontSize: '11px', 
                  margin: '0',
                  lineHeight: '14px'
                }}>
                  Analyze product reviews and sentiment (Coming Soon)
                </p>
              </div>
            </div>
            
            <div style={{ 
              marginTop: '8px',
              padding: '6px 8px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              fontSize: '9px',
              color: 'rgba(255, 220, 220, 0.7)',
              textAlign: 'center'
            }}>
              🚧 Feature in Development
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions" style={{
          marginTop: '12px'
        }}>
          <h4 style={{ 
            color: '#FFDCDCFF', 
            fontSize: '12px', 
            fontWeight: '500',
            margin: '0 0 8px 0'
          }}>
            Quick Actions
          </h4>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px'
          }}>
            <button 
              onClick={() => navigate('/history')}
              className="quick-action-button"
              style={{
                background: 'rgba(255, 220, 220, 0.1)',
                border: '1px solid rgba(255, 220, 220, 0.2)',
                borderRadius: '6px',
                padding: '8px',
                cursor: 'pointer',
                color: '#FFDCDCFF',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 220, 220, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 220, 220, 0.1)';
              }}
            >
              <FaHistory />
              <span>History</span>
            </button>
            
            <button 
              onClick={() => navigate('/settings')}
              className="quick-action-button"
              style={{
                background: 'rgba(255, 220, 220, 0.1)',
                border: '1px solid rgba(255, 220, 220, 0.2)',
                borderRadius: '6px',
                padding: '8px',
                cursor: 'pointer',
                color: '#FFDCDCFF',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 220, 220, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 220, 220, 0.1)';
              }}
            >
              <FaCog />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;
