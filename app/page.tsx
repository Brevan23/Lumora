import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { HowItWorks } from "@/components/site/HowItWorks";
import { Gallery } from "@/components/site/Gallery";
import { UploadSection } from "@/components/site/UploadSection";
import { Faq } from "@/components/site/Faq";
import { Footer } from "@/components/site/Footer";

export default function Home() {
  return (
    <>
      <Header overHero />
      <main>
        <Hero />
        <HowItWorks />
        <Gallery />
        <UploadSection />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
