import React from 'react';

export const PlaceholderPage = ({ title }: { title: string }) => {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">
        Este módulo do NexFarmaPro está em construção. O motor de infraestrutura já foi conectado no backend.
      </p>
    </div>
  );
};