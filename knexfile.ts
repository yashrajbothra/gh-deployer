import { Config } from 'knex';

// Update with your config settings.
require('dotenv').config({ path: __dirname + '/.env' });

export const config: {
    [key: string]: Config;
} = {
    development: {
        client: 'mysql2',
        connection: {
            host: process.env.DB_DEV_HOST,
            database: process.env.DB_DEV_DB,
            user: process.env.DB_DEV_USER,
            password: process.env.DB_DEV_PASS,
            port: parseInt(process.env.DB_DEV_PORT || '3306'),
        },
        pool: {
            min: 2,
            max: 10,
        },
        migrations: {
            tableName: 'migrations',
        },
    },

    test: {
        client: 'mysql2',
        connection: {
            host: process.env.DB_TEST_HOST,
            database: process.env.DB_TEST_DB,
            user: process.env.DB_TEST_USER,
            password: process.env.DB_TEST_PASS,
            port: parseInt(process.env.DB_TEST_PORT || '3306'),
        },
        pool: {
            min: 2,
            max: 10,
        },
        migrations: {
            tableName: 'migrations',
        },
    },

    production: {
        client: 'mysql2',
        connection: {
            host: process.env.DB_PROD_HOST,
            database: process.env.DB_PROD_DB,
            user: process.env.DB_PROD_USER,
            password: process.env.DB_PROD_PASS,
            port: parseInt(process.env.DB_PROD_PORT || '3306'),
        },
        pool: {
            min: 2,
            max: 10,
        },
        migrations: {
            tableName: 'migrations',
        },
    },
};

module.exports = config;
export default config;
