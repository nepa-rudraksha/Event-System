import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Welcome from "./pages/Welcome";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Itinerary from "./pages/Itinerary";
import ConsultationBooking from "./pages/ConsultationBooking";
import ConsultationDetails from "./pages/ConsultationDetails";
import ExhibitCategories from "./pages/ExhibitCategories";
import ExhibitList from "./pages/ExhibitList";
import ExhibitDetail from "./pages/ExhibitDetail";
import AskExpert from "./pages/AskExpert";
import MyConsultation from "./pages/MyConsultation";
import VisitorLogin from "./pages/VisitorLogin";
import ExpertQueue from "./pages/ExpertQueue";
import ExpertWorkspace from "./pages/ExpertWorkspace";
import ExpertLogin from "./pages/ExpertLogin";
import ExpertCustomerManagement from "./pages/ExpertCustomerManagement";
import SalesDesk from "./pages/SalesDesk";
import SalesLogin from "./pages/SalesLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import EventManager from "./pages/admin/EventManager";
import ExhibitCatalog from "./pages/admin/ExhibitCatalog";
import InventoryChecklist from "./pages/admin/InventoryChecklist";
import ConsultationControl from "./pages/admin/ConsultationControl";
import CustomerCRM from "./pages/admin/CustomerCRM";
import AddVisitor from "./pages/admin/AddVisitor";
import VisitorList from "./pages/admin/VisitorList";
import NotificationsConsole from "./pages/admin/NotificationsConsole";
import Analytics from "./pages/admin/Analytics";
import ItineraryManager from "./pages/admin/ItineraryManager";
import QRRedirect from "./pages/QRRedirect";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/e/bangalore" replace />} />
        <Route path="/qr/:code" element={<QRRedirect />} />
        <Route path="/api/qr/:code" element={<QRRedirect />} />
        <Route path="/e/:slug" element={<Welcome />} />
        <Route path="/e/:slug/register" element={<Register />} />
        <Route path="/e/:slug/login" element={<VisitorLogin />} />
        <Route path="/e/:slug/dashboard" element={<Dashboard />} />
        <Route path="/e/:slug/itinerary" element={<Itinerary />} />
        <Route path="/e/:slug/consultation" element={<ConsultationBooking />} />
        <Route path="/e/:slug/consultation/details" element={<ConsultationDetails />} />
        <Route path="/e/:slug/exhibits" element={<ExhibitCategories />} />
        <Route path="/e/:slug/exhibits/:type" element={<ExhibitList />} />
        <Route path="/e/:slug/exhibits/:type/:id" element={<ExhibitDetail />} />
        <Route path="/e/:slug/exhibits/:type/:id/ask-expert" element={<AskExpert />} />
        <Route path="/e/:slug/my-consultation" element={<MyConsultation />} />

        <Route path="/ops/expert/login" element={<ExpertLogin />} />
        <Route path="/ops/expert/:eventId" element={<ExpertQueue />} />
        <Route path="/ops/expert/:eventId/workspace/:consultationId" element={<ExpertWorkspace />} />
        <Route path="/ops/expert/:eventId/customers" element={<ExpertCustomerManagement />} />
        <Route path="/ops/sales/login" element={<SalesLogin />} />
        <Route path="/ops/sales" element={<SalesDesk />} />

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/event/:eventId/manager" element={<EventManager />} />
        <Route path="/admin/event/:eventId/exhibits" element={<ExhibitCatalog />} />
        <Route path="/admin/event/:eventId/inventory" element={<InventoryChecklist />} />
        <Route path="/admin/event/:eventId/consultation" element={<ConsultationControl />} />
        <Route path="/admin/event/:eventId/customers" element={<CustomerCRM />} />
        <Route path="/admin/event/:eventId/visitors" element={<VisitorList />} />
        <Route path="/admin/event/:eventId/visitors/add" element={<AddVisitor />} />
        <Route path="/admin/event/:eventId/itinerary" element={<ItineraryManager />} />
        <Route path="/admin/event/:eventId/notifications" element={<NotificationsConsole />} />
        <Route path="/admin/event/:eventId/analytics" element={<Analytics />} />
      </Routes>
    </BrowserRouter>
  );
}
