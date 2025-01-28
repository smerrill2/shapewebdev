// Mock database connection
module.exports = {
  connect: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn().mockResolvedValue(true),
  getDb: jest.fn().mockReturnValue({
    collection: jest.fn().mockReturnValue({
      insertOne: jest.fn().mockResolvedValue({ insertedId: 'test-id' }),
      findOne: jest.fn().mockResolvedValue({ _id: 'test-id', data: 'test-data' }),
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          { _id: 'test-id-1', data: 'test-data-1' },
          { _id: 'test-id-2', data: 'test-data-2' }
        ])
      })
    })
  })
}; 