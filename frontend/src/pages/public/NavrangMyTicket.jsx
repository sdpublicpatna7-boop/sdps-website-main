import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Ticket, QrCode, Share2, AlertCircle, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '@/lib/api';
import NavrangNavbar from '@/components/layout/NavrangNavbar';

export default function NavrangMyTicket() {
  const [searchInput, setSearchInput] = useState('');
  const [searchType, setSearchType] = useState('phone'); // phone or booking_id
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    setIsLoading(true);
    setError(null);
    setSearched(true);
    setTickets([]);

    try {
      let res;
      if (searchType === 'booking_id') {
        res = await api.get(`/navrang/booking/${searchInput.trim().toUpperCase()}`);
        setTickets(res.data ? [res.data] : []);
      } else {
        res = await api.post('/navrang/my-tickets', { phone: searchInput.trim() });
        const list = res.data?.bookings || (Array.isArray(res.data) ? res.data : []);
        setTickets(list);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setTickets([]);
      } else {
        setError(err.response?.data?.detail || 'An error occurred while fetching tickets.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = (ticket) => {
    if (navigator.share) {
      navigator.share({
        title: 'My Navrang 2026 Ticket',
        text: `Check out my ticket for Navrang 2026! Booking ID: ${ticket.booking_id}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(`Booking ID: ${ticket.booking_id}`);
      alert('Booking ID copied to clipboard!');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cash': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-brand-navy pb-12 selection:bg-brand-orange selection:text-white">
      <Helmet>
        <title>My Tickets | Navrang 2026 | S.D. Public School</title>
      </Helmet>

      {/* Shared School-Styled Navrang Header */}
      <NavrangNavbar activePage="my-ticket" />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white py-10 px-4 text-center shadow-lg relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-400 via-fuchsia-500 to-transparent pointer-events-none"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <Ticket className="w-10 h-10 mx-auto mb-3 text-amber-400" />
          <h1 className="text-3xl md:text-4xl font-outfit font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-200 mb-2">
            Find My Tickets
          </h1>
          <p className="text-slate-300 text-sm md:text-base">Retrieve and download your Navrang 2026 QR passes</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-8 relative z-20">
        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-purple-100 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="searchType" 
                  value="phone" 
                  checked={searchType === 'phone'}
                  onChange={() => setSearchType('phone')}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm font-medium">By Phone Number</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="searchType" 
                  value="booking_id" 
                  checked={searchType === 'booking_id'}
                  onChange={() => setSearchType('booking_id')}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm font-medium">By Booking ID</span>
              </label>
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={searchType === 'phone' ? 'tel' : 'text'}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={searchType === 'phone' ? "Enter 10-digit mobile number" : "e.g. NVR-123456"}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !searchInput}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Find'}
              </button>
            </div>
          </form>
        </div>

        {/* Results Area */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 mb-8 border border-red-200">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {searched && !isLoading && !error && tickets.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-100">
            <QrCode className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Tickets Found</h3>
            <p className="text-slate-500">We couldn't find any bookings matching your search.</p>
          </div>
        )}

        <div className="space-y-6">
          <AnimatePresence>
            {tickets.map((ticket, index) => (
              <motion.div 
                key={ticket.id || ticket.booking_id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200 flex flex-col md:flex-row"
              >
                {/* Left side: QR Code */}
                <div className="bg-purple-50 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-purple-100 min-w-[240px]">
                  <div className="bg-white p-3 rounded-xl shadow-sm mb-3">
                    <QRCodeSVG 
                      value={ticket.qr_token || ticket.booking_id} 
                      size={150}
                      level="H"
                    />
                  </div>
                  <div className="text-sm font-mono font-bold text-purple-900 bg-purple-100 px-3 py-1 rounded">
                    {ticket.booking_id}
                  </div>
                </div>

                {/* Right side: Details */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-brand-navy capitalize">{ticket.package_id || ticket.package} Package</h3>
                        <p className="text-slate-500 text-sm">{ticket.parent_name} • {ticket.phone}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusColor(ticket.payment_status)}`}>
                        {ticket.payment_status || 'Pending'}
                      </span>
                    </div>

                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-slate-900 mb-2 uppercase tracking-wider">Students</h4>
                      <div className="space-y-1">
                        {ticket.students?.map((s, i) => (
                          <div key={i} className="flex justify-between text-sm bg-slate-50 p-2 rounded">
                            <span className="font-medium">{s.name}</span>
                            <span className="text-slate-500">{s.class_section}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                    <div className="text-sm">
                      <span className="text-slate-500">Entry Status:</span>{' '}
                      <span className={`font-semibold ${ticket.entry_status === 'entered' ? 'text-green-600' : 'text-slate-700'}`}>
                        {ticket.entry_status === 'entered' ? 'Checked In' : 'Not Entered Yet'}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleShare(ticket)}
                      className="text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 p-2 rounded-full transition-colors"
                      title="Share Ticket"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
