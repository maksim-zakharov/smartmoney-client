import React, { FC, useEffect } from 'react';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '../components/ui/card.tsx';
import { cn } from '../lib/utils.ts';
import { moneyFormat } from '../utils.ts';
import { Bell } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog.tsx';
import { Button } from '../components/ui/button.tsx';
import { TypographyParagraph } from '../components/ui/typography.tsx';
import { Input } from '../components/ui/input.tsx';

interface Props {
  ctraderBalance: number;
}

export const CTraderCard: FC<Props> = ({ ctraderBalance }) => {
  const [alertingLevel, setAlertingLevel] = React.useState(Number(localStorage.getItem('alertingLevel') || '0'));

  const handleChangeAlerting = (e) => {
    setAlertingLevel(e.target.value);
    localStorage.setItem('alertingLevel', e.target.value);
  };

  useEffect(() => {
    if (alertingLevel >= ctraderBalance) {
      const body = {
        chat_id: localStorage.getItem('telegramUserId'),
        text: `‼️Баланс ${ctraderBalance.toFixed(2)} ниже ${Number(alertingLevel).toFixed(2)}`,
      };
      fetch(`https://api.telegram.org/bot${localStorage.getItem('telegramToken')}/sendMessage`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    }
  }, [alertingLevel, ctraderBalance]);

  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex gap-2 items-center">XPBEE</CardDescription>
        <CardTitle
          className={cn(
            'text-2xl font-semibold tabular-nums @[250px]/card:text-3xl',
            ctraderBalance > 0 ? 'text-[rgb(44,232,156)]' : 'text-[rgb(255,117,132)]',
          )}
        >
          {moneyFormat(ctraderBalance, 'USDT')}
        </CardTitle>
        <CardAction>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="p-0 h-4 w-4">
                <Bell />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md gap-0">
              <DialogHeader>
                <DialogTitle>Открытие позиции</DialogTitle>
              </DialogHeader>
              <div className="p-3 gap-2 flex flex-col">
                <TypographyParagraph>Выберите объем для позиций</TypographyParagraph>
                <Input onChange={handleChangeAlerting} value={alertingLevel} />
              </div>
            </DialogContent>
          </Dialog>
        </CardAction>
      </CardHeader>
    </Card>
  );
};
