import { Button } from './ui/button.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form.tsx';
import { RadioGroup, RadioGroupItem } from './ui/radio-group.tsx';
import { Input } from 'antd';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { addPair, updatePair } from '../api/alor.slice.ts';
import { useAppDispatch, useAppSelector } from '../store.ts';

export const EditTickerConfig = ({ ticker }: { ticker?: string }) => {
  const dispatch = useAppDispatch();
  const favoritePairs = useAppSelector((state) => state.alorSlice.favoritePairs || []);

  const FormSchema = z.object({
    type: z
      .enum(['solo', 'double', 'triple'], {
        error: 'Нужно выбрать тип арбитража',
      })
      .default('solo'),
    multiple: z
      .number({
        error: 'Нужно выбрать множитель',
      })
      .default(1),
    first: z.string({
      error: 'Нужно выбрать тип арбитража',
    }),
    second: z
      .string({
        error: 'Нужно выбрать тип арбитража',
      })
      .optional(),
    third: z.string().optional(),
  });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });
  function onSubmit(data: z.infer<typeof FormSchema>) {
    // toast("You submitted the following values", {
    //   description: (
    //     <pre className="mt-2 w-[320px] rounded-md bg-neutral-950 p-4">
    //       <code className="text-white">{JSON.stringify(data, null, 2)}</code>
    //     </pre>
    //   ),
    // })
    if (ticker) {
      dispatch(updatePair({ ticker, pair: data }));
    } else {
      dispatch(addPair(data));
    }
    form.reset();
  }

  useEffect(() => {
    if (ticker) {
      const [first, second, third] = ticker.split('/');
      const pair = favoritePairs.find(
        (p) => p.first?.toUpperCase() === first && p.second?.toUpperCase() === second && p.third?.toUpperCase() === third,
      );
      form.setValue('type', pair.type);
      form.setValue('multiple', pair.multiple);
      form.setValue('first', first);
      form.setValue('second', second);
      form.setValue('third', third);
    }
  }, [ticker, favoritePairs]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-0">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Тип арбитража</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col">
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <RadioGroupItem value="solo" />
                    </FormControl>
                    <FormLabel className="font-normal">Один тикер</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <RadioGroupItem value="double" />
                    </FormControl>
                    <FormLabel className="font-normal">Двойной</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <RadioGroupItem value="triple" />
                    </FormControl>
                    <FormLabel className="font-normal">Тройной</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="multiple"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Множитель</FormLabel>
              <FormControl>
                <Input type="number" onChange={(e) => field.onChange(Number(e.target.value))} value={field.value} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2">
          <FormField
            control={form.control}
            name="first"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Тикер 1</FormLabel>
                <FormControl>
                  <Input onChange={field.onChange} value={field.value} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="second"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Тикер 2</FormLabel>
                <FormControl>
                  <Input onChange={field.onChange} value={field.value} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="third"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Тикер 3</FormLabel>
                <FormControl>
                  <Input onChange={field.onChange} value={field.value} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full">
          {ticker ? 'Сохранить' : 'Добавить'}
        </Button>
      </form>
    </Form>
  );
};
