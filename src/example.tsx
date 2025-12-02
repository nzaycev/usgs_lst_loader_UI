import React, { useState } from 'react';
import { Minus, Square, X, Wifi, WifiOff, User, Download, Plus, Settings, Moon, Sun, ChevronDown, Check } from 'lucide-react';

const TitleBar = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('online');
  const [userStatus, setUserStatus] = useState('user');
  const [activePlugin, setActivePlugin] = useState('lst-landsat');
  const [showNetworkDialog, setShowNetworkDialog] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(null);
  const [version, setVersion] = useState('1.2.3');
  const [isDark, setIsDark] = useState(true);

  const plugins = [
    { id: 'lst-landsat', name: 'LST Landsat' },
    { id: 'forest-fires', name: 'Forest fires Sentinel' },
    { id: 'ndvi-modis', name: 'NDVI MODIS' },
    { id: 'soil-moisture', name: 'Soil Moisture' },
    { id: 'ocean-color', name: 'Ocean Color' },
    { id: 'air-quality', name: 'Air Quality Monitor' },
    { id: 'climate-data', name: 'Climate Data' },
    { id: 'terrain-analysis', name: 'Terrain Analysis' }
  ];

  const startUpdate = () => {
    setUpdateProgress(0);
    setShowUpdateDialog(false);
    const interval = setInterval(() => {
      setUpdateProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setVersion('1.2.4');
          setTimeout(() => setUpdateProgress(null), 1000);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const getUserStatusInfo = () => {
    switch(userStatus) {
      case 'guest': return { icon: User, text: 'Guest', color: isDark ? 'text-gray-400' : 'text-gray-500' };
      case 'authorizing': return { icon: User, text: 'Authorizing...', color: 'text-yellow-400' };
      case 'user': return { icon: User, text: 'John Doe', color: isDark ? 'text-blue-400' : 'text-blue-600' };
      default: return { icon: User, text: 'Unknown', color: isDark ? 'text-gray-400' : 'text-gray-500' };
    }
  };

  const userInfo = getUserStatusInfo();
  const UserIcon = userInfo.icon;

  const theme = {
    bg: isDark ? 'bg-neutral-900' : 'bg-white',
    bgSecondary: isDark ? 'bg-neutral-800' : 'bg-gray-50',
    border: isDark ? 'border-neutral-700' : 'border-gray-200',
    text: isDark ? 'text-gray-100' : 'text-gray-900',
    textMuted: isDark ? 'text-gray-400' : 'text-gray-600',
    hover: isDark ? 'hover:bg-neutral-800' : 'hover:bg-gray-100',
    activeTab: isDark ? 'bg-blue-600' : 'bg-blue-50',
    activeTabText: isDark ? 'text-white' : 'text-blue-600',
    dialog: isDark ? 'bg-neutral-800' : 'bg-white',
    dialogBorder: isDark ? 'border-neutral-600' : 'border-gray-200',
  };

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Title Bar */}
      <div className={`${theme.bg} ${theme.border} border-b select-none flex-shrink-0`}>
        <div className="h-9 flex items-center justify-between">
          {/* Left: App Title & Tabs */}
          <div className="flex items-center flex-1 min-w-0 pl-3 pr-2">
            <div className="flex items-center space-x-3 mr-4 flex-shrink-0">
              <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded" />
              <span className={`text-xs font-medium ${theme.text}`}>GeoApp</span>
            </div>
            
            {/* Tabs with custom scrollbar styling */}
            <div className="flex items-center space-x-1 overflow-x-auto flex-1 min-w-0" style={{
              scrollbarWidth: 'thin',
              scrollbarColor: isDark ? '#404040 transparent' : '#d1d5db transparent'
            }}>
              <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                  height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: ${isDark ? '#404040' : '#d1d5db'};
                  border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: ${isDark ? '#525252' : '#9ca3af'};
                }
              `}</style>
              <div className="flex items-center space-x-1 custom-scrollbar">
                {plugins.map(plugin => (
                  <button
                    key={plugin.id}
                    onClick={() => setActivePlugin(plugin.id)}
                    className={`px-3 py-1.5 text-xs whitespace-nowrap rounded transition-colors flex-shrink-0 ${
                      activePlugin === plugin.id
                        ? `${theme.activeTab} ${theme.activeTabText} font-medium`
                        : `${theme.textMuted} ${theme.hover}`
                    }`}
                  >
                    {plugin.name}
                  </button>
                ))}
                <button
                  className={`p-1.5 ${theme.textMuted} ${theme.hover} rounded transition-colors flex-shrink-0`}
                  title="Manage plugins"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center h-full flex-shrink-0">
            {/* Theme Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className={`h-full px-3 ${theme.hover} transition-colors ${theme.textMuted}`}
              title="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Window Controls */}
            <button 
              className={`w-12 h-full flex items-center justify-center ${theme.hover} transition-colors`}
              title="Minimize"
            >
              <Minus className={`w-4 h-4 ${theme.text}`} />
            </button>
            <button 
              onClick={() => setIsMaximized(!isMaximized)}
              className={`w-12 h-full flex items-center justify-center ${theme.hover} transition-colors`}
              title={isMaximized ? "Restore" : "Maximize"}
            >
              <Square className={`w-3.5 h-3.5 ${theme.text}`} />
            </button>
            <button 
              className={`w-12 h-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors ${theme.text}`}
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Placeholder */}
      <div className={`flex-1 ${theme.bgSecondary} p-8`}>
        <div className={`${theme.bg} rounded-lg p-6 ${theme.border} border`}>
          <h2 className={`text-lg font-semibold ${theme.text} mb-4`}>
            {plugins.find(p => p.id === activePlugin)?.name}
          </h2>
          <p className={theme.textMuted}>
            Content area placeholder. This is where your main application content would be displayed.
          </p>
        </div>
      </div>

      {/* Status Bar */}
      <div className={`${theme.bgSecondary} border-t ${theme.border} px-3 py-1 flex items-center justify-between text-xs ${theme.textMuted} flex-shrink-0`}>
        <div className="flex items-center space-x-4">
          <span className={theme.text}>
            {plugins.find(p => p.id === activePlugin)?.name}
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Version & Update */}
          <div className="relative">
            <button
              onClick={() => setShowUpdateDialog(!showUpdateDialog)}
              className={`flex items-center space-x-1.5 px-2 py-1 rounded ${theme.hover} transition-colors`}
              title="Version & updates"
            >
              <span>v{version}</span>
              {updateProgress !== null ? (
                <div className="w-12 h-1 bg-neutral-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${updateProgress}%` }}
                  />
                </div>
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
            {showUpdateDialog && (
              <div className={`absolute right-0 bottom-full mb-1 w-56 ${theme.dialog} border ${theme.dialogBorder} rounded-lg shadow-xl py-1 z-50`}>
                <div className={`text-xs font-medium ${theme.text} px-3 py-2`}>Updates</div>
                <button
                  onClick={startUpdate}
                  className={`w-full text-left px-3 py-2 text-xs ${theme.hover} ${theme.textMuted} flex items-center justify-between`}
                >
                  <span>Check for updates</span>
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  className={`w-full text-left px-3 py-2 text-xs ${theme.hover} ${theme.textMuted}`}
                >
                  Release notes
                </button>
                <div className={`border-t ${theme.border} my-1`} />
                <div className={`px-3 py-2 text-xs ${theme.textMuted}`}>
                  Current: v{version}
                </div>
              </div>
            )}
          </div>

          {/* Network Status */}
          <div className="relative">
            <button
              onClick={() => setShowNetworkDialog(!showNetworkDialog)}
              className={`px-2 py-1 rounded ${theme.hover} transition-colors flex items-center space-x-1.5 ${
                networkStatus === 'online' 
                  ? 'text-green-500' 
                  : 'text-red-500'
              }`}
              title={networkStatus === 'online' ? 'Online' : 'Offline'}
            >
              {networkStatus === 'online' ? (
                <Wifi className="w-3.5 h-3.5" />
              ) : (
                <WifiOff className="w-3.5 h-3.5" />
              )}
              <span className="text-xs">{networkStatus === 'online' ? 'Online' : 'Offline'}</span>
            </button>
            {showNetworkDialog && (
              <div className={`absolute right-0 bottom-full mb-1 w-48 ${theme.dialog} border ${theme.dialogBorder} rounded-lg shadow-xl py-1 z-50`}>
                <div className={`text-xs font-medium ${theme.text} px-3 py-2`}>Network</div>
                <button
                  onClick={() => { setNetworkStatus('online'); setShowNetworkDialog(false); }}
                  className={`w-full text-left px-3 py-2 text-xs ${theme.hover} ${theme.textMuted} flex items-center justify-between`}
                >
                  <span>Connected</span>
                  {networkStatus === 'online' && <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => { setNetworkStatus('offline'); setShowNetworkDialog(false); }}
                  className={`w-full text-left px-3 py-2 text-xs ${theme.hover} ${theme.textMuted} flex items-center justify-between`}
                >
                  <span>Disconnected</span>
                  {networkStatus === 'offline' && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* User Status */}
          <div className="relative">
            <button
              onClick={() => setShowUserDialog(!showUserDialog)}
              className={`px-2 py-1 rounded flex items-center space-x-1.5 ${theme.hover} transition-colors ${userInfo.color}`}
              title={userInfo.text}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span className="text-xs">{userInfo.text}</span>
            </button>
            {showUserDialog && (
              <div className={`absolute right-0 bottom-full mb-1 w-48 ${theme.dialog} border ${theme.dialogBorder} rounded-lg shadow-xl py-1 z-50`}>
                <div className={`text-xs font-medium ${theme.text} px-3 py-2`}>Account</div>
                <button
                  onClick={() => { setUserStatus('guest'); setShowUserDialog(false); }}
                  className={`w-full text-left px-3 py-2 text-xs ${theme.hover} ${theme.textMuted}`}
                >
                  Switch to Guest
                </button>
                <button
                  onClick={() => { setUserStatus('authorizing'); setShowUserDialog(false); setTimeout(() => setUserStatus('user'), 2000); }}
                  className={`w-full text-left px-3 py-2 text-xs ${theme.hover} ${theme.textMuted}`}
                >
                  Sign In
                </button>
                {userStatus === 'user' && (
                  <button
                    onClick={() => { setUserStatus('guest'); setShowUserDialog(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-red-500 hover:bg-opacity-10 text-red-500"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Settings */}
          <button 
            className={`p-1 rounded ${theme.hover} transition-colors`} 
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TitleBar;