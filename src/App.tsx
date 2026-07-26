
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Cabinet from "./pages/Cabinet";
import Product from "./pages/Product";
import CategoryPage from "./pages/CategoryPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import Payment from "./pages/Payment";
import Installation from "./pages/Installation";
import Support from "./pages/Support";
import About from "./pages/About";
import ReviewsPage from "./pages/ReviewsPage";
import NewsPage from "./pages/NewsPage";
import NewsPost from "./pages/NewsPost";
import Offer from "./pages/Offer";
import NotFound from "./pages/NotFound";
import OnlineWidget from "@/components/site/OnlineWidget";
import AdminActivity from "./pages/admin/Activity";
import AdminFinance from "./pages/admin/Finance";
import AdminAuthHistory from "./pages/admin/AuthHistory";
import AdminPayouts from "./pages/admin/Payouts";
import AdminUsers from "./pages/admin/Users";
import AdminModeration from "./pages/admin/Moderation";
import AdminSupport from "./pages/admin/Support";
import AdminBanners from "./pages/admin/Banners";
import AdminNews from "./pages/admin/News";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <OnlineWidget />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/moderation" element={<AdminModeration />} />
            <Route path="/admin/banners" element={<AdminBanners />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/activity" element={<AdminActivity />} />
            <Route path="/admin/finance" element={<AdminFinance />} />
            <Route path="/admin/auth-history" element={<AdminAuthHistory />} />
            <Route path="/admin/payouts" element={<AdminPayouts />} />
            <Route path="/admin/support" element={<AdminSupport />} />
            <Route path="/admin/news" element={<AdminNews />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/cabinet" element={<Cabinet />} />
            <Route path="/product/:slug" element={<Product />} />
            <Route path="/catalog/:category" element={<CategoryPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/installation" element={<Installation />} />
            <Route path="/support" element={<Support />} />
            <Route path="/about" element={<About />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/news/:slug" element={<NewsPost />} />
            <Route path="/offer" element={<Offer />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;