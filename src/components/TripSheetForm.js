import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import Label from './Label';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from './Card';
import { supabase } from '../lib/supabase';

const tripSheetSchema = z.object({
  driver_id: z.string().min(1, { message: 'Driver is required' }),
  car_id: z.string().min(1, { message: 'Car is required' }),
  trip_date: z.string().min(1, { message: 'Date is required' }),
  start_km: z.number().min(0, { message: 'Start KM must be non-negative' }),
  end_km: z.number().min(0, { message: 'End KM must be non-negative' }),
  fuel_kg: z.number().optional().nullable().transform(val => val === null || isNaN(val) ? undefined : val),
  cash_collected: z.number().optional().nullable().transform(val => val === null || isNaN(val) ? undefined : val),
  route: z.string().min(1, { message: 'Route is required' }),
  notes: z.string().optional(),
});

const mockDrivers = [
  { id: 'd1', name: 'Ravi Kumar' },
  { id: 'd2', name: 'Priya Sharma' },
  { id: 'd3', name: 'Amit Singh' },
];

const mockCars = [
  { id: 'c1', name: 'Auto 001 - TN 01 AB 1234' },
  { id: 'c2', name: 'Auto 002 - TN 01 CD 5678' },
  { id: 'c3', name: 'Auto 003 - TN 01 EF 9012' },
];

const TripSheetForm = () => {
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm({
    resolver: zodResolver(tripSheetSchema),
    defaultValues: {
      start_km: 0,
      end_km: 0,
      fuel_kg: 0,
      cash_collected: 0,
    }
  });
  
  const [drivers, setDrivers] = useState([]);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  
  // Smart suggestions state
  const [suggestedFuel, setSuggestedFuel] = useState(null);
  const [suggestedCash, setSuggestedCash] = useState(null);
  const [suggestionNotes, setSuggestionNotes] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [historicalData, setHistoricalData] = useState(null);

  // Watch form values for suggestions
  const driverId = watch('driver_id');
  const route = watch('route');
  const startKm = watch('start_km');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // In a real app, these would be actual Supabase queries
        // const { data: driversData } = await supabase.from('drivers').select('id, name');
        // const { data: carsData } = await supabase.from('cars').select('id, name');
        
        // Using mock data for now
        setDrivers(mockDrivers);
        setCars(mockCars);
      } catch (error) {
        console.error('Error fetching data:', error);
        setMessage('Failed to load form data');
        setMessageType('error');
      }
    };
    fetchData();
  }, []);

  // Smart suggestions effect
  useEffect(() => {
    const getSuggestions = async () => {
      if (driverId && route && startKm !== undefined && startKm > 0) {
        setIsSuggesting(true);
        try {
          // Get the current session to obtain the access token
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData?.session?.access_token;
          
          if (!accessToken) {
            console.error('No access token available for suggestions');
            return;
          }

          const response = await fetch('https://bezbxacfnfgbbvgtwhxh.supabase.co/functions/v1/smart-entry-suggestions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
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
            setConfidenceScore(data.confidence_score || 0);
            setHistoricalData(data.historical_data);
          } else {
            console.error('Error fetching suggestions:', data.error);
            setSuggestedFuel(null);
            setSuggestedCash(null);
            setSuggestionNotes('Could not fetch suggestions.');
            setConfidenceScore(0);
            setHistoricalData(null);
          }
        } catch (error) {
          console.error('Network error fetching suggestions:', error);
          setSuggestedFuel(null);
          setSuggestedCash(null);
          setSuggestionNotes('Network error fetching suggestions.');
          setConfidenceScore(0);
          setHistoricalData(null);
        } finally {
          setIsSuggesting(false);
        }
      } else {
        setSuggestedFuel(null);
        setSuggestedCash(null);
        setSuggestionNotes('');
        setConfidenceScore(0);
        setHistoricalData(null);
      }
    };

    // Debounce to avoid too many API calls
    const debounceTimeout = setTimeout(() => {
      getSuggestions();
    }, 1000); // 1 second debounce

    return () => clearTimeout(debounceTimeout);
  }, [driverId, route, startKm]);

  const onSubmit = async (formData) => {
    setLoading(true);
    setMessage('');
    
    try {
      // Format the date to YYYY-MM-DD format if needed
      const tripData = {
        ...formData,
        // Ensure trip_date is in the correct format
        trip_date: formData.trip_date,
      };

      // Call the Supabase Edge Function
      // First, get the current session to obtain the access token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      if (!accessToken) {
        throw new Error('You must be logged in to submit a trip sheet');
      }
      
      const response = await fetch('https://bezbxacfnfgbbvgtwhxh.functions.supabase.co/trip-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Include the user's JWT token for authentication
          // This token will be manually verified by the Edge Function using supabaseClient.auth.getUser()
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(tripData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save trip sheet');
      }

      setMessage('Trip sheet saved successfully!');
      setMessageType('success');
      reset();
      
      // Clear suggestions after successful submission
      setSuggestedFuel(null);
      setSuggestedCash(null);
      setSuggestionNotes('');
      setConfidenceScore(0);
      setHistoricalData(null);
    } catch (error) {
      console.error('Error submitting trip sheet:', error);
      setMessage(error.message || 'Failed to save trip. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
      // Clear message after 5 seconds
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // Helper function to get confidence color
  const getConfidenceColor = (score) => {
    if (score >= 0.7) return 'text-green-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
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
            <Label htmlFor="driver_id">Driver</Label>
            <Select id="driver_id" {...register('driver_id')} className="mt-1">
              <option value="">Select a driver</option>
              {drivers.map(driver => (
                <option key={driver.id} value={driver.id}>{driver.name}</option>
              ))}
            </Select>
            {errors.driver_id && <p className="text-red-500 text-xs mt-1">{errors.driver_id.message}</p>}
          </div>

          <div>
            <Label htmlFor="car_id">Car</Label>
            <Select id="car_id" {...register('car_id')} className="mt-1">
              <option value="">Select a car</option>
              {cars.map(car => (
                <option key={car.id} value={car.id}>{car.name}</option>
              ))}
            </Select>
            {errors.car_id && <p className="text-red-500 text-xs mt-1">{errors.car_id.message}</p>}
          </div>

          <div>
            <Label htmlFor="trip_date">Date</Label>
            <Input type="date" id="trip_date" {...register('trip_date', { valueAsDate: false })} className="mt-1" />
            {errors.trip_date && <p className="text-red-500 text-xs mt-1">{errors.trip_date.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_km">Start KM</Label>
              <Input type="number" id="start_km" {...register('start_km', { valueAsNumber: true })} className="mt-1" />
              {errors.start_km && <p className="text-red-500 text-xs mt-1">{errors.start_km.message}</p>}
            </div>
            <div>
              <Label htmlFor="end_km">End KM</Label>
              <Input type="number" id="end_km" {...register('end_km', { valueAsNumber: true })} className="mt-1" />
              {errors.end_km && <p className="text-red-500 text-xs mt-1">{errors.end_km.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="route">Route</Label>
            <Input id="route" {...register('route')} className="mt-1" placeholder="e.g., City Center to Airport" />
            {errors.route && <p className="text-red-500 text-xs mt-1">{errors.route.message}</p>}
          </div>

          {/* Smart Suggestions Section */}
          {(isSuggesting || suggestedFuel !== null || suggestedCash !== null) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">🤖 AI Suggestions</h4>
              {isSuggesting && (
                <p className="text-sm text-blue-600">Loading suggestions...</p>
              )}
              {suggestedFuel !== null && suggestedCash !== null && !isSuggesting && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Suggested Fuel:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{suggestedFuel} KG</span>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setValue('fuel_kg', suggestedFuel)}
                        className="text-xs px-2 py-1"
                      >
                        Use
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Suggested Cash:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">₹{suggestedCash}</span>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setValue('cash_collected', suggestedCash)}
                        className="text-xs px-2 py-1"
                      >
                        Use
                      </Button>
                    </div>
                  </div>
                  {confidenceScore > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-700">Confidence:</span>
                      <span className={`text-sm font-medium ${getConfidenceColor(confidenceScore)}`}>
                        {Math.round(confidenceScore * 100)}%
                      </span>
                    </div>
                  )}
                  {historicalData && (
                    <div className="text-xs text-gray-600">
                      Based on {historicalData.total_trips_analyzed} historical trips
                    </div>
                  )}
                  {suggestionNotes && (
                    <p className="text-xs text-gray-600 mt-2">{suggestionNotes}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fuel_kg">Fuel (KG)</Label>
              <Input type="number" id="fuel_kg" step="0.1" {...register('fuel_kg', { valueAsNumber: true })} className="mt-1" />
              {errors.fuel_kg && <p className="text-red-500 text-xs mt-1">{errors.fuel_kg.message}</p>}
            </div>
            <div>
              <Label htmlFor="cash_collected">Cash Collected</Label>
              <Input type="number" id="cash_collected" step="0.01" {...register('cash_collected', { valueAsNumber: true })} className="mt-1" />
              {errors.cash_collected && <p className="text-red-500 text-xs mt-1">{errors.cash_collected.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input id="notes" {...register('notes')} className="mt-1" placeholder="Any additional information" />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Trip'}
          </Button>
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

export default TripSheetForm;
