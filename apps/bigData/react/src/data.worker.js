const firstnames = [
  'Amanda', 'Andrew', 'Anthony', 'Ashley', 'Barbara', 'Betty', 'Brian', 'Carol', 'Charles', 'Christopher',
  'Daniel', 'David', 'Deborah', 'Donna', 'Elizabeth', 'Emily', 'George', 'Jack', 'James', 'Jennifer',
  'Jessica', 'Joe', 'John', 'Joseph', 'Joshua', 'Karen', 'Kenneth', 'Kelly', 'Kevin', 'Kimberly',
  'Linda', 'Lisa', 'Margaret', 'Mark', 'Mary', 'Matthew', 'Max', 'Melissa', 'Michael', 'Michelle',
  'Nancy', 'Patricia', 'Paul', 'Richard', 'Robert', 'Ronald', 'Sam', 'Sandra', 'Sarah', 'Stephanie',
  'Steven', 'Susan', 'Thomas', 'Timothy', 'Tobias', 'William'
];

const lastnames = [
  'Adams', 'Allen', 'Anderson', 'Baker', 'Brown', 'Campbell', 'Carter', 'Clark', 'Davis', 'Flores',
  'Garcia', 'Gonzales', 'Green', 'Hall', 'Harris', 'Hernandez', 'Hill', 'Jackson', 'Johnson', 'Jones',
  'King', 'Lee', 'Lewis', 'Lopez', 'Martin', 'Martinez', 'Miller', 'Mitchell', 'Moore', 'Nelson',
  'Nguyen', 'Perez', 'Rahder', 'Ramirez', 'Roberts', 'Rivera', 'Robinson', 'Rodriguez', 'Sanchez', 'Scott',
  'Smith', 'Taylor', 'Thomas', 'Thompson', 'Torres', 'Uhlig', 'Walker', 'Waters', 'White', 'Williams',
  'Wilson', 'Wright', 'Young'
];

const generateData = (amountRows, amountColumns) => {
  console.log('Start creating data', { amountRows, amountColumns });

  const records = [];
  const amountFirstnames = firstnames.length;
  const amountLastnames = lastnames.length;

  for (let row = 0; row < amountRows; row++) {
    const record = {
      id: row + 1,
      counter: Math.round(Math.random() * 100),
      firstname: firstnames[Math.floor(Math.random() * amountFirstnames)],
      lastname: lastnames[Math.floor(Math.random() * amountLastnames)],
      progress: Math.round(Math.random() * 100),
    };

    for (let column = 7; column <= amountColumns; column++) {
      record['number' + column] = Math.round(Math.random() * 10000);
    }
    records.push(record);
  }

  return records;
};

self.onmessage = (e) => {
  const { amountRows, amountColumns } = e.data;
  const result = generateData(amountRows, amountColumns);
  self.postMessage(result);
};