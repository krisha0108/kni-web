import SiteHeader from "../_components/SiteHeader";
import Footer from "../_components/Footer";

export default function BlogShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />

      {children}

      <Footer />
    </div>
  );
}
