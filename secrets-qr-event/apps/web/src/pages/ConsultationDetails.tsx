import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AppBar,
  AppShell,
  Field,
  Input,
  PrimaryButton,
  SectionCard,
  StickyFooter,
} from "../components/ui";
import { EditIcon, SaveIcon, InfoIcon } from "../components/Icons";
import { LocationAutocomplete } from "../components/LocationAutocomplete";
import { fetchVisitorSummary, updateBirthDetails } from "../lib/api";
import { getSession } from "../lib/session";

export default function ConsultationDetails() {
  const { slug = "bangalore" } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const [loading, setLoading] = useState(false);
  const [dob, setDob] = useState("");
  const [tob, setTob] = useState("");
  const [pob, setPob] = useState("");
  const [locationData, setLocationData] = useState<{ lat: number; lng: number; timezone: string } | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!session?.visitorId) {
      navigate(`/e/${slug}`);
      return;
    }
    if (dataLoaded) return; // Only load once
    
    let cancelled = false;
    fetchVisitorSummary(session.visitorId)
      .then((data) => {
        if (cancelled) return;
        if (data?.birthDetails?.dob) {
          setDob(String(data.birthDetails.dob).slice(0, 10));
        }
        if (data?.birthDetails?.tob) {
          setTob(data.birthDetails.tob);
        }
        if (data?.birthDetails?.pob) {
          setPob(data.birthDetails.pob);
        }
        if (data?.birthDetails?.lat && data?.birthDetails?.lng && data?.birthDetails?.timezone) {
          setLocationData({
            lat: data.birthDetails.lat,
            lng: data.birthDetails.lng,
            timezone: data.birthDetails.timezone,
          });
        }
        setDataLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setDataLoaded(true);
      });
    
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.visitorId, slug]); // Removed dataLoaded and navigate from deps to prevent loops

  const handleSave = async () => {
    if (!session) return;
    setLoading(true);
    try {
      await updateBirthDetails(session.visitorId, {
        dob: dob || undefined,
        tob: tob || undefined,
        pob: pob || undefined,
        lat: locationData?.lat,
        lng: locationData?.lng,
        timezone: locationData?.timezone,
      });
      navigate(`/e/${slug}/consultation`);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (value: string, location?: { lat: number; lng: number; timezone: string }) => {
    setPob(value);
    if (location) {
      setLocationData(location);
    } else {
      setLocationData(null);
    }
  };

  return (
    <AppShell>
      <AppBar 
        title={
          <div className="flex items-center gap-2">
            <EditIcon size={20} className="text-gold" />
            <span>Birth Details</span>
          </div>
        } 
      />
      
      <div className="space-y-6">
        <div>
          <h2 className="text-title text-textDark mb-2">Your Birth Information</h2>
          <p className="text-body text-textLight">
            These details help our experts provide accurate spiritual guidance and recommendations.
          </p>
        </div>

        <SectionCard>
          <div className="space-y-6">
            <Field label="Full Name" hint="This cannot be changed">
              <Input value={session?.name ?? ""} onChange={() => undefined} disabled />
            </Field>
            <Field label="WhatsApp Number" hint="This cannot be changed">
              <Input value={session?.phone ?? ""} onChange={() => undefined} disabled />
            </Field>
            <Field label="Email Address" hint="This cannot be changed">
              <Input value={session?.email ?? ""} onChange={() => undefined} disabled />
            </Field>
            <div className="pt-4 border-t border-creamDark">
              <Field label="Date of Birth" required hint="Select your date of birth">
                <Input value={dob} onChange={setDob} type="date" />
              </Field>
            </div>
            <Field label="Time of Birth" required hint="Enter the time you were born (HH:MM format)">
              <Input value={tob} onChange={setTob} type="time" />
            </Field>
            <Field label="Place of Birth" required hint="Search and select your place of birth from the dropdown">
              <LocationAutocomplete
                value={pob}
                onChange={handleLocationChange}
                placeholder="Search for your place of birth (e.g., Mumbai, Bangalore, Virginia)"
                disabled={loading}
              />
            </Field>
            <div className="mt-4 p-4 rounded-xl bg-cream border border-creamDark">
              <div className="flex items-start gap-3">
                <InfoIcon size={20} className="text-gold flex-shrink-0 mt-0.5" />
                <p className="text-sm text-textMedium">
                  <strong>Why we need this:</strong> Your birth details (date, time, and place) help our experts calculate your astrological chart and provide personalized recommendations for Rudraksha and spiritual items.
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <StickyFooter>
        <PrimaryButton onClick={handleSave} disabled={loading || !dob || !tob || !pob}>
          <div className="flex items-center justify-center gap-2">
            {loading ? (
              <span>Saving...</span>
            ) : (
              <>
                <SaveIcon size={18} />
                <span>Save Birth Details & Continue</span>
              </>
            )}
          </div>
        </PrimaryButton>
      </StickyFooter>
    </AppShell>
  );
}
