
async function testDelete() {
    const itemId = 'cmlg8ainm006sca21j602e2ip';
    const userId = 'cmlg8aids0000ca215zi9d0qp';
    const url = `http://localhost:3001/v1/inventory/${itemId}`;

    console.log(`Testing DELETE ${url} with user ${userId}`);
    try {
        const response = await globalThis.fetch(url, {
            method: 'DELETE',
            headers: {
                'x-user-id': userId
            }
        });

        console.log(`Status: ${response.status}`);
        const data = await response.json();
        console.log('Response:', data);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

testDelete();
