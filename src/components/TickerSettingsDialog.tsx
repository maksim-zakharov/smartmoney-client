import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog.tsx';
import { Button } from './ui/button.tsx';
import React from 'react';
import { EditTickerConfig } from './EditTickerConfig.tsx';

export const TickerSettingsDialog = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Добавить тикер</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавление тикера</DialogTitle>
        </DialogHeader>
        <div className="p-3">
          <EditTickerConfig />
        </div>
      </DialogContent>
    </Dialog>
  );
};
