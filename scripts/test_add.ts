import { addStudent } from '../lib/actions';

async function test() {
    console.log('Adding student...');
    const result = await addStudent({
        name: 'MANUAL TEST',
        category: 'INFANTIL',
        monthly_quota: 8500,
        phone: '123456789'
    });
    console.log('Result:', result);
    process.exit(0);
}

test();
