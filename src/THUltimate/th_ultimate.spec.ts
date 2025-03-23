import {defaultConfig, StateManager} from "./th_ultimate_oneIt.ts";
import {testMocks} from "../test.mocks.ts";
import * as allure from "allure-js-commons";
import {Swing} from "./models.ts";

// @ts-ignore
const swingMap = (swing: Swing) => {
    if(!swing) return swing;
    // @ts-ignore
    const {_sidePrice, _isDebug, ...element} = swing;
    return element;
};

const expectIteration = (received: any[], expected: any[]) => {
    // Логируем несовпадающие элементы
    received.forEach((element, index) => {
        const receivedItem = swingMap(element)
        const expectedItem = swingMap(expected[index]);
        try {
            // Используем expect для глубокого сравнения каждого элемента
            expect(receivedItem).toEqual(expectedItem);
        } catch (error) {
            // Если элементы не совпадают, логируем их
            console.log(`Mismatch at index ${index}:`);
            console.log('Expected:', expectedItem);
            console.log('Received:', receivedItem);
        }
    });
}

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
    testMocks.forEach((value, key) => {
        const test = value.skip ? it.skip : it;

        test(key, async () => {
            value.allureEpic && await allure.epic(value.allureEpic);
            value.allureFeature && await allure.feature(value.allureFeature);
            await allure.story(key);

            const manager2 = new StateManager(value.data, defaultConfig);

            manager2.calculate();

            if(value.swings){
                expect(value.swings.length).toEqual(manager2.swings.length);
                expectIteration(value.swings, manager2.swings);
                expect(value.swings.map(swingMap)).toEqual(manager2.swings.map(swingMap));
            }

            if(value.boses){
                expect(value.boses.length).toEqual(manager2.boses.length);
                expectIteration(value.boses, manager2.boses);
                expect(value.boses).toEqual(manager2.boses);
            }

            if(value.orderblocks){
                expect(value.orderblocks.length).toEqual(manager2.pois.length);
                expectIteration(value.orderblocks, manager2.pois);
                expect(value.orderblocks).toEqual(manager2.pois);
            }
        })
    })
})