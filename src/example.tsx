import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Cloud,
  Download,
  Edit2,
  Filter,
  FolderOpen,
  Globe,
  HardDrive,
  Map,
  Minus,
  Play,
  Plus,
  Search,
  Settings,
  Square,
  Trash2,
  Wifi,
  WifiOff,
  X
} from "lucide-react";
import React, { useState } from "react";

// Mock data
const mockCollections = [
  {
    id: 1,
    name: "Region_A_2024_01",
    sceneId: "LC09_L2SP_142021_20240115_20240125_02_T1",
    satellite: "Landsat 9",
    region: "142021",
    regionName: "Красноярск",
    status: "ready",
    source: "online",
    date: "2024-01-15",
    size: "2.4 GB",
    progress: 100,
    files: [
      { name: "ST_TRAD.TIF", progress: 100, size: "450 MB" },
      { name: "ST_URAD.TIF", progress: 100, size: "450 MB" },
      { name: "ST_B4.TIF", progress: 100, size: "520 MB" },
      { name: "ST_B8.TIF", progress: 100, size: "520 MB" },
      { name: "ST_QA.TIF", progress: 100, size: "460 MB" },
    ],
  },
  {
    id: 2,
    name: "Region_B_2024_02",
    sceneId: "LC08_L2SP_155032_20240220_20240301_02_T1",
    satellite: "Landsat 8",
    region: "155032",
    regionName: "Москва",
    status: "processing",
    source: "online",
    date: "2024-02-20",
    size: "1.8 GB",
    progress: 65,
    currentStep: "Atmospheric Correction",
    stepProgress: 45,
    files: [] as Array<{ name: string; progress: number; size: string }>,
  },
  {
    id: 3,
    name: "Region_C_2024_03",
    sceneId: "LC09_L2SP_178015_20240310_20240320_02_T1",
    satellite: "Landsat 9",
    region: "178015",
    regionName: null,
    status: "downloading",
    source: "online",
    date: "2024-03-10",
    size: "3.1 GB",
    progress: 42,
    files: [
      { name: "ST_TRAD.TIF", progress: 100, size: "520 MB" },
      { name: "ST_URAD.TIF", progress: 100, size: "520 MB" },
      { name: "ST_B4.TIF", progress: 65, size: "600 MB" },
      { name: "ST_B8.TIF", progress: 20, size: "600 MB" },
      { name: "ST_QA.TIF", progress: 0, size: "580 MB" },
    ],
  },
  {
    id: 4,
    name: "Region_D_2024_01",
    sceneId: "LC08_L2SP_142021_20240122_20240202_02_T1",
    satellite: "Landsat 8",
    region: "142021",
    regionName: "Красноярск",
    status: "ready",
    source: "local",
    date: "2024-01-22",
    size: "2.7 GB",
    progress: 100,
    files: [] as Array<{ name: string; progress: number; size: string }>,
  },
  {
    id: 5,
    name: "Region_E_2024_02",
    sceneId: "LC09_L2SP_125045_20240228_20240310_02_T1",
    satellite: "Landsat 9",
    region: "125045",
    regionName: "Санкт-Петербург",
    status: "error",
    source: "online",
    date: "2024-02-28",
    size: "0 GB",
    progress: 0,
    files: [] as Array<{ name: string; progress: number; size: string }>,
  },
];

const App = () => {
  const [collections] = useState(mockCollections);
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOnline] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [activeDialog, setActiveDialog] = useState(null);
  const [lastAction, setLastAction] = useState("local");
  const [authData, setAuthData] = useState({ email: "", token: "" });
  const [selectedDates, setSelectedDates] = useState([]);
  const [launchParams, setLaunchParams] = useState({
    algorithm: "standard",
    outputFolder: "/output",
    saveIntermediate: true,
  });

  const statusColors: Record<string, string> = {
    ready: "bg-green-900 text-green-300 border-green-700",
    processing: "bg-blue-900 text-blue-300 border-blue-700",
    downloading: "bg-yellow-900 text-yellow-300 border-yellow-700",
    error: "bg-red-900 text-red-300 border-red-700",
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(collections.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkAction = (action: string) => {
    if (selectedIds.length === 0) return;

    if (action === "launch") {
      setActiveDialog("launch");
    } else if (action === "download") {
      // Handle download
      console.log("Download selected:", selectedIds);
    } else if (action === "delete") {
      // Handle delete
      console.log("Delete selected:", selectedIds);
    }
  };

  const handleAddCollection = (type: string) => {
    setLastAction(type);
    setShowAddMenu(false);
    if (type === "local") {
      setActiveDialog("layerMapping");
    } else {
      setActiveDialog("auth");
    }
  };

  const canDownload = () => {
    return selectedIds.some((id) => {
      const collection = collections.find((c) => c.id === id);
      return (
        collection &&
        collection.source === "online" &&
        collection.status !== "ready"
      );
    });
  };

  // Dialog Components
  const Dialog = ({ title, children, onClose, width = "max-w-md" }: { title: string; children: React.ReactNode; onClose: () => void; width?: string }) => (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div
        className={`bg-gray-800 rounded shadow-2xl ${width} w-full mx-4 overflow-hidden border border-gray-700`}
      >
        <div className="bg-gray-900 px-4 py-2.5 flex items-center justify-between cursor-move border-b border-gray-700">
          <h3 className="text-sm font-medium text-gray-200">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );

  const LaunchDialog = () => (
    <Dialog title="Launch Calculations" onClose={() => setActiveDialog(null)}>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-400 mb-1 block">
            Algorithm Type
          </label>
          <select
            value={launchParams.algorithm}
            onChange={(e) =>
              setLaunchParams({ ...launchParams, algorithm: e.target.value })
            }
            className="w-full bg-gray-700 text-gray-200 px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="standard">Standard Processing</option>
            <option value="advanced">Advanced Analysis</option>
            <option value="fast">Fast Mode</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1 block">
            Output Folder
          </label>
          <input
            type="text"
            value={launchParams.outputFolder}
            onChange={(e) =>
              setLaunchParams({ ...launchParams, outputFolder: e.target.value })
            }
            className="w-full bg-gray-700 text-gray-200 px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="saveIntermediate"
            checked={launchParams.saveIntermediate}
            onChange={(e) =>
              setLaunchParams({
                ...launchParams,
                saveIntermediate: e.target.checked,
              })
            }
            className="mr-2"
          />
          <label htmlFor="saveIntermediate" className="text-sm text-gray-300">
            Save intermediate results
          </label>
        </div>

        <div className="text-xs text-gray-400 bg-gray-700 p-3 rounded">
          <strong>Selected collections:</strong> {selectedIds.length}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setActiveDialog(null)}
            className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => setActiveDialog(null)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Launch
          </button>
        </div>
      </div>
    </Dialog>
  );

  const LayerMappingDialog = () => {
    const [mappings, setMappings] = useState<Record<string, string>>({
      ST_TRAD: "",
      ST_URAD: "",
      ST_B4: "",
      ST_B8: "",
      ST_QA: "",
    });

    return (
      <Dialog
        title="Map Layers"
        onClose={() => setActiveDialog(null)}
        width="max-w-lg"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-400 mb-4">
            Map required layers to files in the selected folder
          </p>
          {Object.keys(mappings).map((layer) => (
            <div key={layer}>
              <label className="text-sm text-gray-300 mb-1 flex items-center">
                {layer}
                <span className="text-red-400 ml-1">*</span>
              </label>
              <select
                value={mappings[layer]}
                onChange={(e) =>
                  setMappings({ ...mappings, [layer]: e.target.value })
                }
                className="w-full bg-gray-700 text-gray-200 px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
              >
                <option value="">Select file...</option>
                <option value="file1.tif">Band_01.tif</option>
                <option value="file2.tif">Band_02.tif</option>
                <option value="file3.tif">Band_03.tif</option>
              </select>
            </div>
          ))}

          <div className="flex gap-2 pt-4">
            <button
              onClick={() => setActiveDialog(null)}
              className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setActiveDialog(null)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Import
            </button>
          </div>
        </div>
      </Dialog>
    );
  };

  const AuthDialog = () => (
    <Dialog title="Online Authentication" onClose={() => setActiveDialog(null)}>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Email</label>
          <input
            type="email"
            value={authData.email}
            onChange={(e) =>
              setAuthData({ ...authData, email: e.target.value })
            }
            placeholder="user@example.com"
            className="w-full bg-gray-700 text-gray-200 px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1 block">
            Access Token
          </label>
          <input
            type="password"
            value={authData.token}
            onChange={(e) =>
              setAuthData({ ...authData, token: e.target.value })
            }
            placeholder="••••••••••••••••"
            className="w-full bg-gray-700 text-gray-200 px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setActiveDialog(null)}
            className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => setActiveDialog("mapSelection")}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </Dialog>
  );

  const MapSelectionDialog = () => (
    <Dialog
      title="Select Region"
      onClose={() => setActiveDialog(null)}
      width="max-w-3xl"
    >
      <div className="space-y-4">
        <div className="bg-gray-700 h-80 rounded flex items-center justify-center border border-gray-600">
          <div className="text-center">
            <Map size={48} className="text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Interactive map placeholder</p>
            <p className="text-gray-500 text-xs mt-1">
              Draw rectangle or use viewport bounds
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveDialog(null)}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => setActiveDialog("dateSelection")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Select Dates
          </button>
        </div>
      </div>
    </Dialog>
  );

  const DateSelectionDialog = () => {
    const availableDates = [
      { date: "2024-03-15", available: true, added: false },
      { date: "2024-03-10", available: true, added: true },
      { date: "2024-03-05", available: true, added: false },
      { date: "2024-02-28", available: true, added: false },
      { date: "2024-02-20", available: false, added: false },
    ];

    return (
      <Dialog
        title="Select Dates for Download"
        onClose={() => setActiveDialog(null)}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-400 mb-3">
            Select dates to download (already added dates are marked with ✓)
          </p>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {availableDates.map((item) => (
              <div
                key={item.date}
                className={`flex items-center justify-between p-3 rounded border ${
                  item.added
                    ? "bg-green-900 border-green-700 cursor-not-allowed"
                    : item.available
                    ? "bg-gray-700 border-gray-600 hover:border-blue-500 cursor-pointer"
                    : "bg-gray-700 border-gray-600 opacity-50 cursor-not-allowed"
                }`}
                onClick={() => {
                  if (item.available && !item.added) {
                    setSelectedDates((prev) =>
                      prev.includes(item.date)
                        ? prev.filter((d) => d !== item.date)
                        : [...prev, item.date]
                    );
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-gray-400" />
                  <span className="text-gray-200">{item.date}</span>
                </div>
                {item.added && <Check size={18} className="text-green-400" />}
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={() => setActiveDialog(null)}
              className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setActiveDialog(null);
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={selectedDates.length === 0}
            >
              Download ({selectedDates.length})
            </button>
          </div>
        </div>
      </Dialog>
    );
  };

  return (
    <div className="h-screen bg-gray-900 text-gray-200 flex flex-col overflow-hidden">
      {/* Windows-style Title Bar */}
      <div className="bg-gray-800 px-3 py-1.5 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Satellite Data Repository</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-3">
            {isOnline ? (
              <Wifi size={14} className="text-green-400" />
            ) : (
              <WifiOff size={14} className="text-red-400" />
            )}
            <span className="text-xs text-gray-400">
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
          <button className="p-1 hover:bg-gray-700 transition-colors">
            <Settings size={16} className="text-gray-400" />
          </button>
          <button className="p-1.5 hover:bg-gray-700 transition-colors">
            <Minus size={14} className="text-gray-400" />
          </button>
          <button className="p-1.5 hover:bg-gray-700 transition-colors">
            <Square size={12} className="text-gray-400" />
          </button>
          <button className="p-1.5 hover:bg-red-600 transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        {/* Toolbar */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="text"
              placeholder="Search collections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 text-gray-200 pl-10 pr-4 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => handleBulkAction("launch")}
            disabled={selectedIds.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Play size={16} />
            Launch ({selectedIds.length})
          </button>

          <button
            onClick={() => handleBulkAction("download")}
            disabled={!canDownload()}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download size={16} />
            Download
          </button>

          <button
            onClick={() => handleBulkAction("delete")}
            disabled={selectedIds.length === 0}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Trash2 size={16} />
            Delete
          </button>

          <button className="p-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors border border-gray-700">
            <Filter size={18} />
          </button>
        </div>

        {/* Collections Table */}
        <div className="flex-1 bg-gray-800 rounded overflow-hidden border border-gray-700">
          <div className="overflow-auto h-full">
            <table className="w-full">
              <thead className="bg-gray-900 sticky top-0">
                <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
                  <th className="p-3 w-10"></th>
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={
                        selectedIds.length === collections.length &&
                        collections.length > 0
                      }
                    />
                  </th>
                  <th className="p-3 w-10"></th>
                  <th className="p-3">Name / Scene ID</th>
                  <th className="p-3">Satellite</th>
                  <th className="p-3">Region</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Size</th>
                  <th className="p-3">Progress</th>
                  <th className="p-3 w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {collections.map((collection) => (
                  <React.Fragment key={collection.id}>
                    <tr className="border-b border-gray-700 hover:bg-gray-700 hover:bg-opacity-50 transition-colors">
                      <td className="p-3">
                        {(collection.files.length > 0 ||
                          collection.status === "processing") && (
                          <button
                            onClick={() => toggleExpand(collection.id)}
                            className="text-gray-400 hover:text-gray-200"
                          >
                            {expandedIds.includes(collection.id) ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(collection.id)}
                          onChange={() => handleSelect(collection.id)}
                        />
                      </td>
                      <td className="p-3">
                        {collection.source === "local" ? (
                          <span title="Local source">
                            <HardDrive
                              size={16}
                              className="text-gray-500"
                            />
                          </span>
                        ) : (
                          <span title="Online source">
                            <Cloud
                              size={16}
                              className="text-blue-400"
                            />
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {collection.name}
                          </span>
                          <span className="text-xs text-gray-500 font-mono">
                            {collection.sceneId}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-gray-300">
                        {collection.satellite}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-300 font-mono">
                            {collection.region}
                          </span>
                          {collection.regionName && (
                            <span className="text-xs text-gray-500">
                              {collection.regionName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs border ${
                            statusColors[collection.status]
                          }`}
                        >
                          {collection.status}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-gray-400">
                        {collection.date}
                      </td>
                      <td className="p-3 text-sm text-gray-400">
                        {collection.size}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all"
                              style={{ width: `${collection.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-10 text-right">
                            {collection.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => setActiveDialog("launch")}
                            className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                            title="Launch"
                          >
                            <Play size={16} />
                          </button>
                          <button
                            className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                            title="Rename"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="p-1.5 hover:bg-red-900 text-red-400 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Details */}
                    {expandedIds.includes(collection.id) && (
                      <tr className="bg-gray-850 border-b border-gray-700">
                        <td colSpan={11} className="p-0">
                          <div className="px-12 py-3">
                            {collection.status === "processing" &&
                              collection.currentStep && (
                                <div className="mb-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-400">
                                      Current Step:{" "}
                                      <strong className="text-gray-300">
                                        {collection.currentStep}
                                      </strong>
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {collection.stepProgress}%
                                    </span>
                                  </div>
                                  <div className="bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="h-full bg-blue-500 transition-all"
                                      style={{
                                        width: `${collection.stepProgress}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}

                            {collection.files.length > 0 && (
                              <div className="space-y-1.5">
                                <div className="text-xs text-gray-400 font-medium mb-2">
                                  File Downloads:
                                </div>
                                {collection.files.map((file, idx) => {
                                  if (typeof file === 'string') return null;
                                  return (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-3 text-xs"
                                    >
                                      <span className="text-gray-400 w-32 font-mono">
                                        {file.name}
                                      </span>
                                      <div className="flex-1 bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                        <div
                                          className="h-full bg-green-500 transition-all"
                                          style={{ width: `${file.progress}%` }}
                                        />
                                      </div>
                                      <span className="text-gray-500 w-12 text-right">
                                        {file.progress}%
                                      </span>
                                      <span className="text-gray-500 w-16 text-right">
                                        {file.size}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FAB Button */}
      <div className="absolute bottom-6 right-6">
        {showAddMenu && (
          <div className="absolute bottom-16 right-0 bg-gray-800 rounded shadow-2xl border border-gray-700 overflow-hidden mb-2">
            <button
              onClick={() =>
                handleAddCollection(lastAction === "local" ? "local" : "online")
              }
              className="w-full px-4 py-3 hover:bg-gray-700 transition-colors flex items-center gap-3 text-sm border-b border-gray-700"
            >
              {lastAction === "local" ? (
                <FolderOpen size={18} />
              ) : (
                <Globe size={18} />
              )}
              <span>
                {lastAction === "local" ? "From Local Folder" : "Search Online"}
              </span>
              <span className="text-xs text-gray-500 ml-2">(Last used)</span>
            </button>
            <button
              onClick={() =>
                handleAddCollection(lastAction === "local" ? "online" : "local")
              }
              className="w-full px-4 py-3 hover:bg-gray-700 transition-colors flex items-center gap-3 text-sm"
            >
              {lastAction === "local" ? (
                <Globe size={18} />
              ) : (
                <FolderOpen size={18} />
              )}
              <span>
                {lastAction === "local" ? "Search Online" : "From Local Folder"}
              </span>
            </button>
          </div>
        )}

        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-105"
        >
          <Plus
            size={24}
            className={`transition-transform ${showAddMenu ? "rotate-45" : ""}`}
          />
        </button>
      </div>

      {/* Dialogs */}
      {activeDialog === "launch" && <LaunchDialog />}
      {activeDialog === "layerMapping" && <LayerMappingDialog />}
      {activeDialog === "auth" && <AuthDialog />}
      {activeDialog === "mapSelection" && <MapSelectionDialog />}
      {activeDialog === "dateSelection" && <DateSelectionDialog />}
    </div>
  );
};

export default App;
