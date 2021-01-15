import { Car } from './car';

export const START_POPULATION   = 10;
export const NEW_SPAWNS         = 5;

const INITIAL_INPUTS    = 100;
const VARIANCE          = 0.2;

const INPUT_DURATION = 15;

const FORWARDS  = (timestamp: number): [number, string, number][] => [[timestamp, "up", INPUT_DURATION]];
const LEFT      = (timestamp: number): [number, string, number][] => [[timestamp, "up", INPUT_DURATION], [timestamp, "left", INPUT_DURATION]];
const RIGHT     = (timestamp: number): [number, string, number][] => [[timestamp, "up", INPUT_DURATION], [timestamp, "right", INPUT_DURATION]];

/**
 *  Generate a subset of solutions (a set of chromosomes)
 */
export function generate_population(rng: Phaser.Math.RandomDataGenerator): Array<Array<[number, string, number]>>
{
    let population: Array<Array<[number, string, number]>> = [];
    for(let i = 0; i < START_POPULATION; i++)
        population.push(generate_chromosome(rng));

    return population;
}

/**
 *  Generate a single solution
 */
function generate_chromosome(rng: Phaser.Math.RandomDataGenerator): Array<[number, string, number]>
{
    let chromosome: Array<[number, string, number]> = [];

    let timestamp = 0;

    let input_count = Math.floor(rand_between(INITIAL_INPUTS * (1 - VARIANCE), INITIAL_INPUTS * (1 + VARIANCE)));
    for(let i = 0; i < input_count; i++)
    {
        let action = rng.pick([FORWARDS, LEFT, RIGHT]);
        let genomes = action(timestamp);
        for(let genome of genomes)
            chromosome.push(genome);
        
        timestamp += INPUT_DURATION + 50;
    }

    return chromosome;
}

/**
 * Fitness Proportionate Selection
 * Become a parent with a probability which is proportional to one's fitness
 */
export function parent_selection(cars: Array<Car>): Car
{
    let fitness_sum = cars.reduce((acc, curr) => acc + curr.fitness, 0);
    let rand = rand_between(0, fitness_sum);

    let partial_sum = 0;
    for(let car of cars)
    {
        partial_sum += car.fitness;
        if(partial_sum > rand)
            return car
    }

    return undefined;
}

/**
 * A.k.a reproduce
 * Uniform crossover
 */
export function crossover(mom: Array<[number, string, number]>, dad: Array<[number, string, number]>): Array<[number, string, number]>
{
    let length = Math.min(mom.length, dad.length);

    let kid: Array<[number, string, number]> = [];
    for(let i = 0; i < length; i++)
    {
        let gene = rand_boolean() ? mom[i] : dad[i];
        kid.push(gene);
    }
    
    // Adopt remaining genes from bigger chromsome
    let parent = mom.length > dad.length ? mom : dad;
    for(let i = length; i < parent.length; i++)
        kid.push(parent[i]);

    return kid;
}

export function mutate(subject: Array<[number, string, number]>)
{
    let mutations = rand_between(1, 5);
    for(let i = 0; i < mutations; i++)
    {
        let index = rand_between(0, subject.length - 1);

        let action = rand_of(["up", "left", "right"]);
        subject[index][1] = action;
    }

    // TODO: Chance to get new actions / remove
}

/** Utilities */

function rand_between(from: number, to: number)
{
    return (Math.random() * (to - from)) + from;
}

function rand_boolean()
{
    return Math.round(Math.random()) == 0;
}

function rand_of(array)
{
    return array[Math.floor(Math.random() * array.length)];
}
