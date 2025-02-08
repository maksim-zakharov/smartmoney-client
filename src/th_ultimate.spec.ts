import {HistoryObject, notTradingTime, StateManager, Swing} from "./th_ultimate";
import * as day from './stubs/MTLR_M5_1738875600_1738961999.json';
import * as oneIterationSwing from './stubs/oneIterationSwing.json';

describe('th_ultimate', () => {
    // Могут различаться и это ок
    // it('oneIteration vs old Swings day', () => {
    //     const manager1 = new StateManager(day.filter(d => !notTradingTime(d)));
    //     const manager2 = new StateManager(day.filter(d => !notTradingTime(d)));
    //
    //     manager1.calculateSwingsOld();
    //
    //     manager2.calculate();
    //
    //     expect(manager1.swings.length).toEqual(manager2.swings.length);
    //
    //     // Логируем несовпадающие элементы
    //     manager2.swings.forEach((element, index) => {
    //         try {
    //             // Используем expect для глубокого сравнения каждого элемента
    //             expect(element).toEqual(manager1.swings[index]);
    //         } catch (error) {
    //             // Если элементы не совпадают, логируем их
    //             console.log(`Mismatch at index ${index}:`);
    //             console.log('Expected:', manager1.swings[index]);
    //             console.log('Received:', element);
    //         }
    //     });
    //
    //     expect(manager1.swings).toEqual(manager2.swings);
    // })
    it('only oneIteration Swings day', () => {
        const manager2 = new StateManager(day.filter(d => !notTradingTime(d)));

        const mockData = oneIterationSwing as any as Swing[];

        manager2.calculate();

        expect(mockData.length).toEqual(manager2.swings.length);

        // Логируем несовпадающие элементы
        manager2.swings.forEach((element, index) => {
            try {
                // Используем expect для глубокого сравнения каждого элемента
                expect(element).toEqual(mockData[index]);
            } catch (error) {
                // Если элементы не совпадают, логируем их
                console.log(`Mismatch at index ${index}:`);
                console.log('Expected:', mockData[index]);
                console.log('Received:', element);
            }
        });

        expect(mockData).toEqual(manager2.swings);
    })
})