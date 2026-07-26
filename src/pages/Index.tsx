import Header from '@/components/site/Header';
import Hero from '@/components/site/Hero';
import Catalog from '@/components/site/Catalog';
import HowItWorks from '@/components/site/HowItWorks';
import Reviews from '@/components/site/Reviews';
import News from '@/components/site/News';
import Footer from '@/components/site/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <main>
        <Hero />
        <Catalog />
        <HowItWorks />
        <Reviews />
        <News />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
