import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Form as UIForm, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Input } from 'antd';
import { Button } from './ui/button';
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addAlert, clearAlertDialog } from '../api/alerts.slice';

export const AlertDialog = () => {
  const alertConfig = useAppSelector((state) => state.alertsSlice.alertConfig);

  const dispatch = useAppDispatch();
  const FormSchema = z.object({
    ticker: z.string({
      error: 'Нужно выбрать тикер',
    }),
    price: z.number({
      error: 'Нужно выбрать цену',
    }),
    condition: z.enum(['lessThen', 'moreThen'], {
      error: 'Нужно выбрать условие',
    }),
    trigger: z.enum(['once', 'everyMinute'], {
      required_error: 'Нужно выбрать триггер',
    }),
    message: z.string().optional(),
  });

  useEffect(() => {
    if (!alertConfig) return;
    form.setValue('ticker', alertConfig.ticker);
    form.setValue('price', alertConfig.price);
  }, [alertConfig]);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });
  function onSubmit(data: z.infer<typeof FormSchema>) {
    dispatch(addAlert(data));
    form.reset();
    handleClose();
  }

  const handleClose = () => {
    dispatch(clearAlertDialog());
  };

  const handleSendTestMessage = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const values = form.getValues();

    const body = {
      chat_id: localStorage.getItem('telegramUserId'),
      text: values.message || `${values.ticker} Цена больше чем ${values.price}`,
    };

    fetch(`https://api.telegram.org/bot${localStorage.getItem('telegramToken')}/sendMessage`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };

  return (
    <Dialog open={Boolean(alertConfig)}>
      <DialogContent onPointerDownOutside={handleClose}>
        <DialogHeader>
          <DialogTitle>Добавить уведомление по {form.getValues('ticker')}</DialogTitle>
        </DialogHeader>
        <UIForm {...form}>
          <form onSubmit={form.handleSubmit((d) => onSubmit(d))} className="p-3 pt-0 flex gap-3 flex-col">
            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Условие</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col">
                      <FormItem className="flex items-center gap-3">
                        <FormControl>
                          <RadioGroupItem value="lessThen" />
                        </FormControl>
                        <FormLabel className="font-normal">Меньше чем</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center gap-3">
                        <FormControl>
                          <RadioGroupItem value="moreThen" />
                        </FormControl>
                        <FormLabel className="font-normal">Больше чем</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Цена</FormLabel>
                  <FormControl>
                    <Input type="number" step={0.00001} onChange={(e) => field.onChange(Number(e.target.value))} value={field.value} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trigger"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Триггер</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col">
                      <FormItem className="flex items-center gap-3">
                        <FormControl>
                          <RadioGroupItem value="once" />
                        </FormControl>
                        <FormLabel className="font-normal">Один раз</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center gap-3">
                        <FormControl>
                          <RadioGroupItem value="everyMinute" />
                        </FormControl>
                        <FormLabel className="font-normal">Раз в минуту</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Сообщение</FormLabel>
                  <FormControl>
                    <Input onChange={(e) => field.onChange(e.target.value)} value={field.value} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Добавить</Button>
            <Button variant="secondary" onClick={handleSendTestMessage}>
              Тест
            </Button>
          </form>
        </UIForm>
      </DialogContent>
    </Dialog>
  );
};
