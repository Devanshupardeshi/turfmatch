"use client"

import { Check, MapPin, Navigation, Car, Star, Clock, ChevronLeft, Phone, PhoneOff, Lock } from "lucide-react"
import { useNav } from "@/lib/turfmatch/navigation"
import { TmButton } from "@/components/turfmatch/tm-button"
import { useNearbyTurfs } from "@/lib/turfmatch/nearby-turfs-store"
import { useCoords } from "@/lib/turfmatch/location-store"
import { GROUNDS } from "@/lib/turfmatch/data"
import { useState, useEffect } from "react"
import { fetchDirections } from "@/lib/turfmatch/google-maps"

export function GroundDetailScreen({ groundId }: { groundId?: string }) {
  const { navigate, goBack } = useNav()
  const { grounds: nearbyGrounds } = useNearbyTurfs()
  const coords = useCoords()
  
  const [eta, setEta] = useState<string | null>(null)
  const [etaLoading, setEtaLoading] = useState(false)
  const [showBookingModal, setShowBookingModal] = useState(false)

  // Try to find ground from live nearby turfs first, then mock data
  const ground =
    nearbyGrounds.find(g => g.id === groundId) ||
    GROUNDS.find(g => g.id === groundId) ||
    nearbyGrounds[0] ||
    GROUNDS[0]

  useEffect(() => {
    if (coords && ground.lat && ground.lng) {
      setEtaLoading(true)
      fetchDirections(coords.lat, coords.lng, ground.lat, ground.lng)
        .then(res => {
          if (res) setEta(res.duration)
        })
        .finally(() => setEtaLoading(false))
    }
  }, [coords, ground])

  const handleCall = () => {
    if (ground.phoneNumber) {
      window.open(`tel:${ground.phoneNumber}`, "_self")
    }
  }

  return (
    <div className="h-full bg-slate-950 flex flex-col relative font-sans">
      {/* Premium Hero Image Section */}
      <div className="relative h-[40vh] shrink-0">
        <img
          src={ground.image || "/placeholder.svg"}
          alt={ground.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg"
          }}
        />
        {/* Gradients for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-slate-950/40" />
        
        {/* Custom Header Area */}
        <div className="absolute top-0 left-0 right-0 p-4 pt-8 flex items-center justify-between">
          <button 
            onClick={goBack}
            className="w-10 h-10 rounded-full bg-slate-900/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-full bg-slate-900/50 backdrop-blur-md border border-white/10 flex items-center gap-1.5 text-xs font-bold text-yellow-400">
              <Star className="w-3.5 h-3.5 fill-current" /> {ground.rating}
              {ground.userRatingCount ? (
                <span className="text-slate-400 font-medium">({ground.userRatingCount})</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-32 -mt-16 relative z-10">
        {/* Title Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
             <div className="text-right shrink-0">
              <p className="text-2xl font-black text-emerald-400">₹{ground.pricePerHour}</p>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">per hour</p>
            </div>
          </div>

          <h1 className="text-2xl font-black text-white mb-2 leading-tight pr-20">
            {ground.name}
          </h1>
          
          <div className="flex flex-col gap-2 mt-3">
            <p className="text-slate-400 flex items-center gap-2 text-sm font-medium">
              <MapPin className="w-4 h-4 text-emerald-500" />
              {ground.location}
            </p>
            <div className="flex items-center gap-4 text-sm font-medium">
              {ground.distanceKm > 0 && (
                <p className="text-slate-300 flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-emerald-500" />
                  {ground.distanceKm} km away
                </p>
              )}
              {etaLoading ? (
                <p className="text-slate-500 flex items-center gap-1.5 animate-pulse">
                  <Car className="w-4 h-4" /> Calc ETA...
                </p>
              ) : eta ? (
                <p className="text-emerald-400 flex items-center gap-1.5">
                  <Car className="w-4 h-4" /> {eta} drive
                </p>
              ) : null}
            </div>
          </div>

          {/* Call Button — inline in the title card */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            {ground.phoneNumber ? (
              <button
                onClick={handleCall}
                className="w-full flex items-center justify-center gap-2.5 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 font-bold text-sm hover:bg-emerald-500/20 transition-colors active:scale-[0.97]"
              >
                <Phone className="w-4.5 h-4.5" />
                Call Turf — {ground.phoneNumber}
              </button>
            ) : (
              <div className="w-full flex items-center justify-center gap-2.5 py-3 bg-slate-800/50 border border-slate-700 rounded-2xl text-slate-500 text-sm font-medium">
                <PhoneOff className="w-4 h-4" />
                Phone number not available on Google
              </div>
            )}
          </div>
        </div>

        <h3 className="text-white text-lg font-bold mb-3 flex items-center gap-2">
           <Check className="w-5 h-5 text-emerald-500" /> Premium Amenities
        </h3>
        <div className="flex flex-wrap gap-2 mb-8">
          {ground.features.map(f => (
            <span
              key={f}
              className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 shadow-sm"
            >
              {f}
            </span>
          ))}
        </div>

        <h3 className="text-white text-lg font-bold mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-500" /> Available Today
        </h3>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {ground.availableSlots.map(s => (
            <button
              key={s}
              className="py-3 bg-slate-900 border border-slate-800 rounded-2xl text-emerald-400 font-bold text-sm hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-colors active:scale-95"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-5 pb-8 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pt-10 flex gap-3 z-20 pointer-events-auto">
        <button 
          onClick={() => navigate("liveNavigation", { 
            lat: ground.lat?.toString(), 
            lng: ground.lng?.toString(), 
            name: ground.name 
          })}
          className="flex-1 bg-slate-800 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors active:scale-95 shadow-lg shadow-slate-900/50"
        >
          <Navigation className="w-5 h-5 text-emerald-400" />
          Directions
        </button>
        <button 
          onClick={() => setShowBookingModal(true)}
          className="flex-[1.5] bg-emerald-500 text-slate-950 font-black rounded-2xl py-4 hover:bg-emerald-400 transition-colors active:scale-95 shadow-lg shadow-emerald-500/20"
        >
          Quick Book
        </button>
      </div>

      {/* Quick Book Modal */}
      {showBookingModal && (
        <div className="absolute inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowBookingModal(false)} />
          <div className="w-full bg-slate-900 rounded-t-3xl p-6 relative z-10 animate-in slide-in-from-bottom-full duration-300">
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-6" />
            <h2 className="text-2xl font-black text-white mb-2">Confirm Booking</h2>
            <p className="text-slate-400 mb-6">{ground.name} • 1 Hour Slot</p>
            
            <div className="bg-slate-950 rounded-2xl p-4 mb-6 border border-slate-800">
               <div className="flex justify-between text-slate-300 mb-2">
                 <span>Turf Cost</span>
                 <span>₹{ground.pricePerHour}</span>
               </div>
               <div className="flex justify-between text-slate-300 mb-4 pb-4 border-b border-slate-800">
                 <span>Platform Fee</span>
                 <span>₹20</span>
               </div>
               <div className="flex justify-between text-white font-bold text-lg">
                 <span>Total</span>
                 <span className="text-emerald-400">₹{ground.pricePerHour + 20}</span>
               </div>
            </div>

            {/* UPI — Coming Soon */}
            <button
              disabled
              className="w-full py-4 text-base font-bold rounded-2xl bg-slate-800 border border-slate-700 text-slate-500 flex items-center justify-center gap-2 mb-3 cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              Pay with UPI — Coming Soon
            </button>

            {/* Call to Book */}
            {ground.phoneNumber ? (
              <button
                onClick={handleCall}
                className="w-full py-4 text-base font-bold rounded-2xl bg-emerald-500 text-white flex items-center justify-center gap-2.5 active:scale-[0.97] transition-transform shadow-lg shadow-emerald-500/25"
              >
                <Phone className="w-5 h-5" />
                Call to Book — {ground.phoneNumber}
              </button>
            ) : (
              <div className="w-full py-4 text-base font-medium rounded-2xl bg-slate-800 border border-slate-700 text-slate-500 flex items-center justify-center gap-2">
                <PhoneOff className="w-4 h-4" />
                Phone number not available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
