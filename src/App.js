import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Car, Truck, Users, MessageSquare, FileText, Settings, LogOut, PlusCircle, ChevronLeft, ChevronRight, Send, Lightbulb, User, Lock } from 'lucide-react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { ProtectedRoute, DriverRoute, ManagerRoute, AdminRoute } from './components/ProtectedRoute';
import { supabase } from './lib/supabase';

// --- Context for global state (e.g., user, auth status) ---
const AppContext = createContext(null);

// Global variables for Firebase/Supabase config (provided by Canvas environment)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Mock Data for demonstration
const mockDrivers = [
  { id: 'd1', name: 'Ravi Kumar' },
  { id: 'd2', name: 'Priya Sharma' },
  { id: 'd3', name: 'Amit Singh' },
];

const mockTripSheets = [
  { id: 't1', driverId: 'd1', date: '2025-07-30', startKm: 1000, endKm: 1150, fuelKg: 10, cashCollected: 500, route: 'City A to City B' },
  { id: 't2', driverId: 'd1', date: '2025-07-31', startKm: 1150, endKm: 1300, fuelKg: 12, cashCollected: 600, route: 'City B to City C' },
  { id: 't3', driverId: 'd2', date: '2025-07-30', startKm: 500, endKm: 620, fuelKg: 8, cashCollected: 400, route: 'City D to City E' },
  { id: 't4', driverId: 'd1', date: '2025-08-01', startKm: 1300, endKm: 1400, fuelKg: 15, cashCollected: 700, route: 'City C to City A' }, // Potential anomaly: fuel > 15kg
  { id: 't5', driverId: 'd3', date: '2025-08-01', startKm: 200, endKm: 350, fuelKg: 10, cashCollected: 550, route: 'City F to City G' },
];

const mockDailyStats = [
  { date: 'Jul 29', trips: 3, fuel: 30, cash: 1500 },
  { date: 'Jul 30', trips: 5, fuel: 45, cash: 2200 },
  { date: 'Jul 31', trips: 4, fuel: 38, cash: 1900 },
  { date: 'Aug 01', trips: 6, fuel: 55, cash: 2800 },
  { date: 'Aug 02', trips: 2, fuel: 18, cash: 900 },
];

// --- Components ---

// Shadcn-like Button (simplified for direct Tailwind usage)
const Button = ({ children, onClick, variant = 'default', size = 'default', className = '', ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
  const variantClasses = {
    default: 'bg-blue-600 text-white shadow hover:bg-blue-700',
    outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-gray-200 text-gray-800 shadow-sm hover:bg-gray-300',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline',
  };
  const sizeClasses = {
    default: 'h-9 px-4 py-2',
    sm: 'h-8 rounded-md px-3 text-xs',
    lg: 'h-10 rounded-md px-8',
    icon: 'h-9 w-9',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

// Shadcn-like Input (simplified)
const Input = ({ type = 'text', className = '', ...props }) => {
  return (
    <input
      type={type}
      className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
};

// Shadcn-like Select (simplified)
const Select = ({ children, className = '', ...props }) => {
  return (
    <select
      className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
};

// Shadcn-like Label (simplified)
const Label = ({ children, className = '', htmlFor, ...props }) => {
  return (
    <label htmlFor={htmlFor} className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`} {...props}>
      {children}
    </label>
  );
};

// Shadcn-like Card (simplified)
const Card = ({ children, className = '', ...props }) => {
  return (
    <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`} {...props}>
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '', ...props }) => {
  return (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

const CardTitle = ({ children, className = '', ...props }) => {
  return (
    <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
};

const CardDescription = ({ children, className = '', ...props }) => {
  return (
    <p className={`text-sm text-muted-foreground ${className}`} {...props}>
      {children}
    </p>
  );
};

const CardContent = ({ children, className = '', ...props }) => {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};

const CardFooter = ({ children, className = '', ...props }) => {
  return (
    <div className={`flex items-center p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};

// --- TripSheetForm Component ---
const tripSheetSchema = z.object({
  driverId: z.string().min(1, { message: 'Driver is required' }),
  date: z.string().min(1, { message: 'Date is required' }),
  startKm: z.number().min(0, { message: 'Start KM must be non-negative' }),
  endKm: z.number().min(0, { message: 'End KM must be non-negative' }),
  fuelKg: z.number().min(0, { message: 'Fuel (kg) must be non-negative' }).nullable().optional(), // Made nullable/optional
  cashCollected: z.number().min(0, { message: 'Cash collected must be non-negative' }).nullable().optional(), // Made nullable/optional
  route: z.string().min(1, { message: 'Route is required' }),
});

const TripSheetForm = () => {
  const { user } = useAuth(); // Get user from auth context
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm({
    resolver: zodResolver(tripSheetSchema),
    defaultValues: {
      fuelKg: null,
      cashCollected: null,
    }
  });
  const [drivers, setDrivers] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  const [suggestedFuel, setSuggestedFuel] = useState(null);
  const [suggestedCash, setSuggestedCash] = useState(null);
  const [suggestionNotes, setSuggestionNotes] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Watch form fields for changes to trigger suggestions
  const driverId = watch('driverId');
  const route = watch('route');
  const startKm = watch('startKm');

  // Debounce mechanism for suggestion fetching
  const debounceTimeoutRef = useRef(null);

  useEffect(() => {
    const fetchDrivers = async () => {
      // In a real app, this would be an API call to your backend /api/drivers
      const { data, error } = await supabase.from('drivers').select();
      if (error) {
        console.error('Error fetching drivers:', error);
      } else {
        setDrivers(data);
      }
    };
    fetchDrivers();
  }, []);

  useEffect(() => {
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const getSuggestions = async () => {
      // Only fetch suggestions if all required fields are present and user is authenticated
      if (driverId && route && startKm !== undefined && user) {
        setIsSuggesting(true);
        setSuggestedFuel(null);
        setSuggestedCash(null);
        setSuggestionNotes('');

        try {
          // Replace with your actual Supabase Edge Function URL for smart-entry-suggestions
          const response = await fetch('https://bezbxacfnfgbbvgtwhxh.supabase.co/functions/v1/smart-entry-suggestions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // In a real app, you'd get the actual user token from Supabase Auth
              'Authorization': `Bearer ${user.id}`, // Using user.id as a mock token for demonstration
            },
            body: JSON.stringify({
              driver_id: driverId,
              current_km: startKm,
              route: route,
            }),
          });
          const data = await response.json();
          if (response.ok) {
            setSuggestedFuel(data.suggested_fuel_kg);
            setSuggestedCash(data.suggested_cash_collected);
            setSuggestionNotes(data.notes);
          } else {
            console.error('Error fetching suggestions:', data.error);
            setSuggestionNotes(`Error: ${data.error || 'Failed to fetch suggestions.'}`);
          }
        } catch (error) {
          console.error('Network error fetching suggestions:', error);
          setSuggestionNotes('Network error fetching suggestions.');
        } finally {
          setIsSuggesting(false);
        }
      } else {
        // Clear suggestions if inputs are incomplete
        setSuggestedFuel(null);
        setSuggestedCash(null);
        setSuggestionNotes('');
      }
    };

    // Set a new debounce timeout
    debounceTimeoutRef.current = setTimeout(getSuggestions, 700); // Wait 700ms after last input

    // Cleanup on unmount or dependency change
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [driverId, route, startKm, user]); // Re-run when these values change

  const onSubmit = async (data) => {
    console.log('Form data:', data);
    // In a real app, this would be an API call to your backend /api/trip-entry
    // Ensure car_id is also sent, perhaps from a default or another input
    const payload = {
      ...data,
      car_id: 'mock-car-id-123', // Placeholder for car_id
      trip_date: data.date, // Ensure field name matches DB
      fuel_kg: data.fuelKg,
      cash_collected: data.cashCollected,
    };

    try {
      const response = await fetch('https://bezbxacfnfgbbvgtwhxh.supabase.co/functions/v1/trip-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`, // Use actual user token
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Trip sheet saved successfully!');
        setMessageType('success');
        reset(); // Clear form after successful submission
        setSuggestedFuel(null); // Clear suggestions
        setSuggestedCash(null);
        setSuggestionNotes('');
      } else {
        console.error('Error saving trip:', result.error);
        setMessage(`Failed to save trip: ${result.details || result.error}`);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Network error saving trip:', error);
      setMessage('Network error: Could not connect to the server.');
      setMessageType('error');
    }
    setTimeout(() => setMessage(''), 5000); // Clear message after 5 seconds
  };

  return (
    <Card className="w-full max-w-md mx-auto p-4 md:p-6 shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle>Trip Sheet Entry</CardTitle>
        <CardDescription>Fill in the details for the daily trip.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="driverId">Driver</Label>
            <Select id="driverId" {...register('driverId')} className="mt-1">
              <option value="">Select a driver</option>
              {drivers.map(driver => (
                <option key={driver.id} value={driver.id}>{driver.name}</option>
              ))}
            </Select>
            {errors.driverId && <p className="text-red-500 text-xs mt-1">{errors.driverId.message}</p>}
          </div>

          <div>
            <Label htmlFor="date">Date</Label>
            <Input type="date" id="date" {...register('date', { valueAsDate: false })} className="mt-1" />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startKm">Start KM</Label>
              <Input type="number" id="startKm" {...register('startKm', { valueAsNumber: true })} className="mt-1" />
              {errors.startKm && <p className="text-red-500 text-xs mt-1">{errors.startKm.message}</p>}
            </div>
            <div>
              <Label htmlFor="endKm">End KM</Label>
              <Input type="number" id="endKm" {...register('endKm', { valueAsNumber: true })} className="mt-1" />
              {errors.endKm && <p className="text-red-500 text-xs mt-1">{errors.endKm.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="route">Route</Label>
            <Input id="route" {...register('route')} className="mt-1" />
            {errors.route && <p className="text-red-500 text-xs mt-1">{errors.route.message}</p>}
          </div>

          {/* Fuel KG input with suggestions */}
          <div>
            <Label htmlFor="fuelKg">Fuel (KG)</Label>
            <Input type="number" id="fuelKg" step="0.1" {...register('fuelKg', { valueAsNumber: true })} className="mt-1" />
            {isSuggesting && <p className="text-sm text-gray-500 flex items-center mt-1"><Lightbulb className="w-4 h-4 mr-1 animate-pulse" /> Loading suggestions...</p>}
            {suggestedFuel !== null && (
              <p className="text-sm text-blue-600 mt-1 flex items-center">
                <Lightbulb className="w-4 h-4 mr-1" /> Suggested: <span className="font-semibold ml-1">{suggestedFuel} KG</span>
                <Button variant="ghost" size="sm" onClick={() => setValue('fuelKg', suggestedFuel)} className="ml-2 px-2 py-1 h-auto">Use</Button>
              </p>
            )}
            {errors.fuelKg && <p className="text-red-500 text-xs mt-1">{errors.fuelKg.message}</p>}
          </div>

          {/* Cash Collected input with suggestions */}
          <div>
            <Label htmlFor="cashCollected">Cash Collected</Label>
            <Input type="number" id="cashCollected" step="0.01" {...register('cashCollected', { valueAsNumber: true })} className="mt-1" />
            {isSuggesting && <p className="text-sm text-gray-500 flex items-center mt-1"><Lightbulb className="w-4 h-4 mr-1 animate-pulse" /> Loading suggestions...</p>}
            {suggestedCash !== null && (
              <p className="text-sm text-blue-600 mt-1 flex items-center">
                <Lightbulb className="w-4 h-4 mr-1" /> Suggested: <span className="font-semibold ml-1">${suggestedCash.toFixed(2)}</span>
                <Button variant="ghost" size="sm" onClick={() => setValue('cashCollected', suggestedCash)} className="ml-2 px-2 py-1 h-auto">Use</Button>
              </p>
            )}
            {errors.cashCollected && <p className="text-red-500 text-xs mt-1">{errors.cashCollected.message}</p>}
          </div>

          {suggestionNotes && suggestedFuel === null && suggestedCash === null && !isSuggesting && (
            <p className="text-sm text-gray-500 mt-1">{suggestionNotes}</p>
          )}

          <Button type="submit" className="w-full">Submit Trip</Button>
          {message && (
            <p className={`mt-2 text-center ${messageType === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

// --- HistoryTable Component ---
const HistoryTable = ({ data }) => {
  return (
    <Card className="w-full overflow-x-auto shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle>Trip History</CardTitle>
        <CardDescription>Recent trip entries.</CardDescription>
      </CardHeader>
      <CardContent>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KM</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fuel (KG)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cash</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((trip) => (
              <tr key={trip.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trip.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mockDrivers.find(d => d.id === trip.driverId)?.name || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trip.route}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trip.endKm - trip.startKm}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trip.fuelKg}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${trip.cashCollected.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

// --- CashFuelSummary Component ---
const CashFuelSummary = ({ data }) => {
  const totalCash = data.reduce((sum, trip) => sum + trip.cashCollected, 0);
  const totalFuel = data.reduce((sum, trip) => sum + trip.fuelKg, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="p-4 shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">Total Cash Collected</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-600">${totalCash.toFixed(2)}</p>
        </CardContent>
      </Card>
      <Card className="p-4 shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">Total Fuel Consumed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-blue-600">{totalFuel.toFixed(1)} KG</p>
        </CardContent>
      </Card>
    </div>
  );
};

// --- DriverSelector Component (simple dropdown) ---
const DriverSelector = ({ selectedDriver, onSelectDriver }) => {
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    const fetchDrivers = async () => {
      const { data, error } = await supabase.from('drivers').select();
      if (error) {
        console.error('Error fetching drivers:', error);
      } else {
        setDrivers(data);
      }
    };
    fetchDrivers();
  }, []);

  return (
    <div className="mb-4">
      <Label htmlFor="driverSelect">Filter by Driver:</Label>
      <Select
        id="driverSelect"
        value={selectedDriver}
        onChange={(e) => onSelectDriver(e.target.value)}
        className="mt-1"
      >
        <option value="">All Drivers</option>
        {drivers.map(driver => (
          <option key={driver.id} value={driver.id}>{driver.name}</option>
        ))}
      </Select>
    </div>
  );
};

// --- ChatInterface Component ---
const ChatInterface = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! How can I help you with fleet data today?", sender: 'bot' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (input.trim() === '') return;

    const newMessage = { id: messages.length + 1, text: input, sender: 'user' };
    setMessages((prev) => [...prev, newMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call your Supabase Edge Function for chat-query
      const response = await fetch('https://bezbxacfnfgbbvgtwhxh.supabase.co/functions/v1/chat-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`, // Use actual user token
        },
        body: JSON.stringify({ query: newMessage.text, chatHistory: messages }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessages((prev) => [...prev, { id: messages.length + 2, text: data.text, sender: 'bot' }]);
      } else {
        console.error('Chat API error:', data.error);
        setMessages((prev) => [...prev, { id: messages.length + 2, text: `Error: ${data.error || 'Failed to get response.'}`, sender: 'bot' }]);
      }
    } catch (error) {
      console.error('Network error calling chat API:', error);
      setMessages((prev) => [...prev, { id: messages.length + 2, text: 'Network error connecting to chatbot.', sender: 'bot' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto flex flex-col h-[600px] shadow-lg rounded-lg">
      <CardHeader className="flex-none">
        <CardTitle>Fleet Chatbot</CardTitle>
        <CardDescription>Ask questions about your fleet data.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] p-3 rounded-lg ${
              msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[70%] p-3 rounded-lg bg-gray-200 text-gray-800 animate-pulse">
              Typing...
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-none p-4 border-t">
        <div className="flex w-full space-x-2">
          <Input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            className="flex-grow"
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

// --- Main App Component with Authentication ---
const AppContent = () => {
  const { user, userProfile, signOut, isDriver, isManager, isAdmin } = useAuth();
  const [currentPage, setCurrentPage] = useState('/dashboard'); // Default to dashboard

  const handleSignOut = async () => {
    await signOut();
  };

  const renderPage = () => {
    switch (currentPage) {
      case '/entry':
        return <EntryPage />;
      case '/dashboard':
        return <DashboardPage />;
      case '/reports':
        return <ReportsPage />;
      case '/audit':
        return <AuditPage />;
      case '/chat':
        return <ChatPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <AppContext.Provider value={{ userId: user?.id, userProfile }}>
      <div className="min-h-screen bg-gray-50 font-inter text-gray-900 flex flex-col md:flex-row">
        {/* Sidebar Navigation */}
        <nav className="bg-white shadow-md md:shadow-lg p-4 md:p-6 flex flex-row md:flex-col justify-between md:justify-start items-center md:items-stretch w-full md:w-64 flex-shrink-0 rounded-b-lg md:rounded-r-lg">
          <div className="flex flex-row md:flex-col space-x-4 md:space-x-0 md:space-y-4 w-full">
            <h1 className="text-2xl font-bold text-blue-700 hidden md:block mb-6">Fleet Dashboard</h1>
            
            {/* Trip Entry - Available to all authenticated users */}
            <Button
              variant={currentPage === '/entry' ? 'default' : 'ghost'}
              className="justify-start w-full px-3 py-2 rounded-md transition-colors duration-200"
              onClick={() => setCurrentPage('/entry')}
            >
              <PlusCircle className="mr-2 h-5 w-5" /> Trip Entry
            </Button>
            
            {/* Dashboard - Manager and Admin only */}
            {(isManager() || isAdmin()) && (
              <Button
                variant={currentPage === '/dashboard' ? 'default' : 'ghost'}
                className="justify-start w-full px-3 py-2 rounded-md transition-colors duration-200"
                onClick={() => setCurrentPage('/dashboard')}
              >
                <Car className="mr-2 h-5 w-5" /> Dashboard
              </Button>
            )}
            
            {/* Reports - Manager and Admin only */}
            {(isManager() || isAdmin()) && (
              <Button
                variant={currentPage === '/reports' ? 'default' : 'ghost'}
                className="justify-start w-full px-3 py-2 rounded-md transition-colors duration-200"
                onClick={() => setCurrentPage('/reports')}
              >
                <FileText className="mr-2 h-5 w-5" /> Reports
              </Button>
            )}
            
            {/* Audit - Manager and Admin only */}
            {(isManager() || isAdmin()) && (
              <Button
                variant={currentPage === '/audit' ? 'default' : 'ghost'}
                className="justify-start w-full px-3 py-2 rounded-md transition-colors duration-200"
                onClick={() => setCurrentPage('/audit')}
              >
                <Settings className="mr-2 h-5 w-5" /> Audit
              </Button>
            )}
            
            {/* Chatbot - Available to all authenticated users */}
            <Button
              variant={currentPage === '/chat' ? 'default' : 'ghost'}
              className="justify-start w-full px-3 py-2 rounded-md transition-colors duration-200"
              onClick={() => setCurrentPage('/chat')}
            >
              <MessageSquare className="mr-2 h-5 w-5" /> Chatbot
            </Button>
          </div>
          
          <div className="mt-auto hidden md:block">
            <div className="text-sm text-gray-500 mb-2">
              <p>User: {userProfile?.email || user?.email}</p>
              <p>Role: {userProfile?.primary_role || 'driver'}</p>
            </div>
            <Button variant="outline" className="justify-start w-full px-3 py-2 rounded-md" onClick={handleSignOut}>
              <LogOut className="mr-2 h-5 w-5" /> Sign Out
            </Button>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-grow p-4 md:p-8 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </AppContext.Provider>
  );
};

// --- Page Components ---
const EntryPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full py-8">
      <TripSheetForm />
    </div>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [selectedDriver, setSelectedDriver] = useState('');
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      setLoadingTrips(true);
      try {
        let url = 'https://bezbxacfnfgbbvgtwhxh.supabase.co/functions/v1/get-trips';
        const params = new URLSearchParams();
        if (selectedDriver) {
          params.append('driverId', selectedDriver);
        }
        // Add date filter if needed, e.g., for 'today's trips'
        // params.append('date', format(new Date(), 'yyyy-MM-dd'));

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${user.id}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          // Map the fetched data to match the mock structure for existing components
          const mappedTrips = data.trips.map(trip => ({
            id: trip.id,
            driverId: trip.driver_id,
            date: trip.trip_date,
            startKm: trip.start_km,
            endKm: trip.end_km,
            fuelKg: trip.fuel_kg,
            cashCollected: trip.cash_collected,
            route: trip.route,
            // Assuming driver name is nested under 'drivers'
            driverName: trip.drivers ? trip.drivers.name : 'N/A'
          }));
          setFilteredTrips(mappedTrips);
        } else {
          console.error('Error fetching trips:', data.error);
          setFilteredTrips([]);
        }
      } catch (error) {
        console.error('Network error fetching trips:', error);
        setFilteredTrips([]);
      } finally {
        setLoadingTrips(false);
      }
    };

    if (user) { // Only fetch if auth is ready
      fetchTrips();
    }
  }, [selectedDriver, user]); // Re-fetch when driver filter or user changes

  if (loadingTrips) {
    return <div className="text-center text-gray-600">Loading trip data...</div>;
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-gray-800">Manager Dashboard</h2>

      <DriverSelector selectedDriver={selectedDriver} onSelectDriver={setSelectedDriver} />

      <CashFuelSummary data={filteredTrips} />

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle>Daily Fleet Activity</CardTitle>
          <CardDescription>Overview of trips, fuel, and cash over time.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={mockDailyStats} // Keep mock data for chart for now, or fetch aggregated data
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="trips" fill="#8884d8" name="Trips" />
              <Bar yAxisId="right" dataKey="fuel" fill="#82ca9d" name="Fuel (KG)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <HistoryTable data={filteredTrips} />
    </div>
  );
};

const ReportsPage = () => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]); // Default to today

  const handleDownload = async () => {
    setMessage('Generating report... Please wait.');
    setMessageType('success');
    try {
      const url = `https://bezbxacfnfgbbvgtwhxh.supabase.co/functions/v1/get-report?date=${reportDate}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${user.id}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `fleet_report_${reportDate}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        setMessage('Report downloaded successfully!');
      } else {
        const errorText = await response.text();
        console.error('Error generating report:', errorText);
        setMessage(`Failed to generate report: ${errorText}`);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Network error generating report:', error);
      setMessage('Network error: Could not connect to the server for report generation.');
      setMessageType('error');
    }
    setTimeout(() => setMessage(''), 5000); // Clear message after 5 seconds
  };

  return (
    <div className="flex flex-col items-center justify-center h-full py-8">
      <Card className="w-full max-w-md mx-auto p-6 shadow-lg rounded-lg text-center">
        <CardHeader>
          <CardTitle>Download Reports</CardTitle>
          <CardDescription>Generate and download daily or custom reports.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center space-y-2">
            <Label htmlFor="reportDate">Select Date for Report:</Label>
            <Input
              type="date"
              id="reportDate"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full max-w-[200px]"
            />
          </div>
          <Button onClick={handleDownload} className="w-full">
            <FileText className="mr-2 h-5 w-5" /> Generate Report
          </Button>
          {message && (
            <p className={`mt-2 ${messageType === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const AuditPage = () => {
  const { user } = useAuth();
  const [anomalies, setAnomalies] = useState([]);
  const [loadingAnomalies, setLoadingAnomalies] = useState(true);

  useEffect(() => {
    const fetchAnomalies = async () => {
      setLoadingAnomalies(true);
      try {
        const response = await fetch('https://bezbxacfnfgbbvgtwhxh.supabase.co/functions/v1/get-anomalies', {
          headers: {
            'Authorization': `Bearer ${user.id}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          // Map fetched anomalies to match mock structure if needed, or adjust rendering
          setAnomalies(data.anomalies.map(anomaly => ({
            id: anomaly.id,
            type: anomaly.anomaly_type,
            description: anomaly.description,
            flaggedAt: new Date(anomaly.flagged_at).toLocaleString(),
            // Add more context from joined tables if available and needed for display
            driverName: anomaly.tripsheets?.drivers?.name || 'N/A',
            tripDate: anomaly.tripsheets?.trip_date || 'N/A',
          })));
        } else {
          console.error('Error fetching anomalies:', data.error);
          setAnomalies([]);
        }
      } catch (error) {
        console.error('Network error fetching anomalies:', error);
        setAnomalies([]);
      } finally {
        setLoadingAnomalies(false);
      }
    };

    if (user) { // Only fetch if auth is ready
      fetchAnomalies();
    }
  }, [user]);

  if (loadingAnomalies) {
    return <div className="text-center text-gray-600">Loading anomalies...</div>;
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-gray-800">AI Flagged Anomalies</h2>
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle>Anomaly List</CardTitle>
          <CardDescription>Issues flagged by the daily audit engine.</CardDescription>
        </CardHeader>
        <CardContent>
          {anomalies.length === 0 ? (
            <p className="text-gray-500">No anomalies detected recently. All clear!</p>
          ) : (
            <ul className="space-y-4">
              {anomalies.map(anomaly => (
                <li key={anomaly.id} className="p-4 border rounded-md bg-red-50 border-red-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-red-700">{anomaly.type}</h4>
                    <span className="text-sm text-gray-500">{anomaly.flaggedAt}</span>
                  </div>
                  <p className="text-sm text-gray-800 mt-1">
                    {anomaly.description}
                    {anomaly.driverName !== 'N/A' && ` (Driver: ${anomaly.driverName})`}
                    {anomaly.tripDate !== 'N/A' && ` (Trip Date: ${anomaly.tripDate})`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const ChatPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full py-8">
      <ChatInterface />
    </div>
  );
};

// --- Main App Component with Authentication ---
const App = () => {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AppContent />
      </ProtectedRoute>
    </AuthProvider>
  );
};

export default App;
