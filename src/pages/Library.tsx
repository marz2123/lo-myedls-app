import React from 'react';
import { Navbar } from '@/components/Navbar';
import { LibraryHubPage } from '@/components/library';

const Library = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <LibraryHubPage />
      </main>
    </div>
  );
};

export default Library;
