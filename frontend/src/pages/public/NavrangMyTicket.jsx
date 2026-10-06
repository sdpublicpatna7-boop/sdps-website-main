import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Ticket, QrCode, Share2, AlertCircle, Loader2, Zap, CheckCircle2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import api from '@/lib/api';
import NavrangNavbar from '@/components/layout/NavrangNavbar';
import WalletPassButton from '@/components/festive/WalletPassButton';

function loadRazorpay() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function NavrangMyTicket() {
  const [searchInput, setSearchInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [searchType, setSearchType] = useState('phone'); // phone or booking_id
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [searched, setSearched] = useState(false);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [payingBookingId, setPayingBookingId] = useState(null);
  const [checkingBookingId, setCheckingBookingId] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await api.get('/navrang/config');
        if (data.razorpay_enabled && data.razorpay_key_id) {
          setRazorpayEnabled(true);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchConfig();
  }, []);

  const fetchTicketsByPhone = async (phone) => {
    const clean = String(phone || '').replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      setError('Please enter a valid 10-digit registered mobile number.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await api.post('/navrang/my-tickets', { phone: clean });
      const list = res.data?.bookings || (Array.isArray(res.data) ? res.data : []);
      setTickets(list);
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

  const fetchBookingByIdAndPhone = async (bId, phone) => {
    const cleanId = String(bId || '').trim().toUpperCase();
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    if (!cleanId) {
      setError('Please enter your Booking ID.');
      return;
    }
    if (cleanPhone.length !== 10) {
      setError('🔒 For ticket security, please enter the 10-digit registered mobile number used during booking.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await api.get(`/navrang/booking/${cleanId}?phone=${cleanPhone}`);
      setTickets(res.data ? [res.data] : []);
    } catch (err) {
      if (err.response?.status === 404) {
        setTickets([]);
      } else if (err.response?.status === 403) {
        setError('Verification failed: This mobile number does not match the registered booking contact.');
      } else {
        setError(err.response?.data?.detail || 'An error occurred while fetching tickets.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bId = urlParams.get('booking_id') || urlParams.get('id');
    const ph = urlParams.get('phone');
    if (bId && ph) {
      setSearchType('booking_id');
      setSearchInput(bId);
      setPhoneInput(ph);
      fetchBookingByIdAndPhone(bId, ph);
    } else if (bId) {
      setSearchType('booking_id');
      setSearchInput(bId);
      toast.info('Please enter your registered 10-digit mobile number to verify and view your pass.');
    } else if (ph) {
      setSearchType('phone');
      setSearchInput(ph);
      fetchTicketsByPhone(ph);
    }
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchType === 'phone') {
      fetchTicketsByPhone(searchInput);
    } else {
      fetchBookingByIdAndPhone(searchInput, phoneInput);
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

  const handlePayNow = async (ticket) => {
    try {
      setPayingBookingId(ticket.booking_id);
      const sdkReady = await loadRazorpay();
      if (!sdkReady) {
        toast.error('Could not load payment gateway. Please check your connection.');
        setPayingBookingId(null);
        return;
      }

      const orderRes = await api.post('/navrang/create-order', { booking_id: ticket.booking_id });
      const order = orderRes.data;

      const rzpOptions = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'S.D. Public School',
        description: `Navrang 2026 Pass - ${ticket.booking_id}`,
        order_id: order.order_id,
        prefill: {
          name: ticket.parent_name || '',
          contact: ticket.parent_phone || ticket.phone || '',
          email: ticket.parent_email || ticket.email || ''
        },
        theme: {
          color: '#581C87'
        },
        handler: async (resp) => {
          try {
            setPayingBookingId(ticket.booking_id);
            await api.post('/navrang/verify-payment', {
              booking_id: ticket.booking_id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature
            });

            toast.success('Payment verified! Your pass is active.');
            setTickets(prev => prev.map(t => 
              t.booking_id === ticket.booking_id 
                ? { ...t, payment_status: 'paid', payment_ref: resp.razorpay_payment_id } 
                : t
            ));
          } catch (verErr) {
            toast.error(verErr.response?.data?.detail || 'Payment verification failed.');
          } finally {
            setPayingBookingId(null);
          }
        },
        modal: {
          ondismiss: () => {
            setPayingBookingId(null);
          }
        }
      };

      const rzp = new window.Razorpay(rzpOptions);
      rzp.on('payment.failed', function (resp) {
        toast.error(`Payment failed: ${resp.error?.description || 'Declined'}`);
        setPayingBookingId(null);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to initiate online payment.');
      setPayingBookingId(null);
    }
  };

  const handleAutoVerify = async (ticket) => {
    try {
      setCheckingBookingId(ticket.booking_id);
      const res = await api.post('/navrang/check-payment-status', { 
        booking_id: ticket.booking_id, 
        phone: ticket.parent_phone || phoneInput || searchInput 
      });
      if (res.data?.is_paid && res.data?.booking) {
        toast.success(`🎉 Payment verified for ${ticket.booking_id}! Pass is now active.`);
        setTickets(prev => prev.map(t => 
          t.booking_id === ticket.booking_id ? res.data.booking : t
        ));
      } else {
        toast.info(res.data?.message || 'Payment not yet captured on Razorpay. If you recently paid in your UPI app, please wait a few seconds and try again.');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to verify payment status with Razorpay.');
    } finally {
      setCheckingBookingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-brand-navy pb-12 selection:bg-brand-orange selection:text-white">
      <Helmet>
        <title>My Tickets & QR Pass | Navrang 2026 | S.D. Public School, Patna</title>
        <meta name="description" content="View and download your official Navrang 2026 QR entry passes and booking receipts for Dandiya Night at S.D. Public School, Patna." />
        <link rel="canonical" href="https://navrang.sdpublic.org/my-ticket" />

        {/* OpenGraph / WhatsApp / Facebook / Telegram */}
        <meta property="og:site_name" content="Navrang 2026 — S.D. Public School, Patna" />
        <meta property="og:title" content="My Tickets & QR Pass | Navrang 2026 | S.D. Public School" />
        <meta property="og:description" content="View and download your official Navrang 2026 QR entry passes and booking receipts for Dandiya Night at S.D. Public School, Patna." />
        <meta property="og:image" content="https://navrang.sdpublic.org/navrang-banner.jpg" />
        <meta property="og:image:secure_url" content="https://navrang.sdpublic.org/navrang-banner.jpg" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1024" />
        <meta property="og:image:height" content="576" />
        <meta property="og:image:alt" content="Navrang 2026 Dandiya Night Celebration" />
        <meta property="og:url" content="https://navrang.sdpublic.org/my-ticket" />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="My Tickets & QR Pass | Navrang 2026 | S.D. Public School" />
        <meta name="twitter:description" content="View and download your official Navrang 2026 QR entry passes and booking receipts for Dandiya Night at S.D. Public School, Patna." />
        <meta name="twitter:image" content="https://navrang.sdpublic.org/navrang-banner.jpg" />
        <meta name="twitter:image:alt" content="Navrang 2026 Dandiya Night Celebration" />
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

      <div className="max-w-2xl mx-auto px-3 sm:px-4 -mt-8 relative z-20">
        {/* Search Form */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 border border-purple-100 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Segmented Pill Selector for Mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl mb-2">
              <button
                type="button"
                onClick={() => {
                  setSearchType('phone');
                  setError(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  searchType === 'phone'
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>📱 By Registered Mobile</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchType('booking_id');
                  setError(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  searchType === 'booking_id'
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>🎫 By Booking ID + Mobile</span>
              </button>
            </div>

            {searchType === 'phone' ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  Enter the 10-digit mobile number provided during booking to retrieve all passes registered to your family.
                </p>
                <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Enter 10-digit registered mobile"
                      maxLength={10}
                      className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors font-mono text-sm"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !searchInput.trim()}
                    className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 active:scale-98 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-sm cursor-pointer text-sm shrink-0"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4" /><span>Find Passes</span></>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <span>🔒 <strong>Pass Theft Protection:</strong> To prevent unauthorized entry, your registered mobile number is verified before displaying any pass.</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Booking ID *</label>
                    <input
                      type="text"
                      inputMode="text"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                      placeholder="e.g. NVR-2026-4LC8"
                      className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 font-mono text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500 uppercase"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Mobile Number *</label>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 font-mono text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !searchInput.trim() || !phoneInput.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700 active:scale-98 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-sm cursor-pointer text-sm"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify Identity & Unlock Pass</span>}
                </button>
              </div>
            )}
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
                <div className="bg-purple-50 p-4 sm:p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-purple-100 min-w-0 sm:min-w-[240px]">
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
                <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-brand-navy capitalize">{ticket.package_id || ticket.package} Package</h3>
                        <p className="text-slate-500 text-sm">{ticket.parent_name} • {ticket.phone}</p>
                        <div className="flex items-center gap-1.5 text-xs text-rose-700 font-semibold mt-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Venue: <strong>SDPS Homeground, Patna</strong> • Oct 15 (6:00 PM)</span>
                        </div>
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
                            <span className="font-medium">{s.name} {s.admission_no ? `(${s.admission_no})` : ''}</span>
                            <span className="text-slate-500">{s.class_section || s.class_name || ''}</span>
                          </div>
                        ))}
                      </div>
                      {ticket.payment_ref && (
                        <div className="mt-2 text-xs text-slate-600 bg-purple-50/50 p-2 rounded-lg border border-purple-100 flex justify-between items-center">
                          <span className="font-semibold text-purple-900">UPI Ref / UTR:</span>
                          <span className="font-mono font-bold text-purple-800">{ticket.payment_ref}</span>
                        </div>
                      )}

                      {/* Payment Status Action Bar */}
                      {ticket.payment_status?.toLowerCase() === 'paid' ? (
                        <div className="mt-3 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Entry Pass Verified & Active</span>
                          </div>
                          <span className="text-[11px] font-mono text-emerald-800">
                            {ticket.payment_ref}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 via-amber-50/40 to-purple-50 rounded-xl border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-xs">
                          <div className="text-xs text-slate-800">
                            <span className="font-bold text-purple-900 flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400" /> Payment Pending • Instant Auto-Verify
                            </span>
                            <span className="text-slate-600 text-[11px] block mt-0.5">
                              Already completed payment or need to complete checkout? Pass activates immediately upon verification.
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() => handleAutoVerify(ticket)}
                              disabled={checkingBookingId === ticket.booking_id}
                              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-60"
                              title="Query Razorpay API to check if payment was captured"
                            >
                              {checkingBookingId === ticket.booking_id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Checking...</span>
                                </>
                              ) : (
                                <>
                                  <Zap className="w-3.5 h-3.5 text-amber-100 fill-amber-100" />
                                  <span>⚡ Auto-Verify</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePayNow(ticket)}
                              disabled={payingBookingId === ticket.booking_id}
                              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-60 transition-all"
                            >
                              {payingBookingId === ticket.booking_id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Opening...</span>
                                </>
                              ) : (
                                <>
                                  <span>Pay ₹{ticket.price || 299}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Mobile Wallet Passes */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                          <span>Add to Mobile Wallet</span>
                          <span className="text-[10px] text-purple-600 font-normal">Offline Lock Screen Pass</span>
                        </div>
                        <WalletPassButton 
                          bookingId={ticket.booking_id} 
                          booking={ticket} 
                          compact={true} 
                        />
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
