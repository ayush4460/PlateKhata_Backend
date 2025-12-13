const socketService = require('../../src/services/socket.service');
const { Server } = require('socket.io');

// Mock socket.io
jest.mock('socket.io');

describe('Socket Service', () => {
  let mockIo;
  let mockSocket;

  beforeEach(() => {
    // Clear mocks
    // Setup default mock implementation
    mockIo = {
      on: jest.fn(),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      use: jest.fn(),
    };
    
    // Default Server constructor mock returns our mockIo
    Server.mockImplementation(() => mockIo);
    
    // We also need to ensuring the singleton instance uses this mock if re-initialized
    // But socketService is a singleton instance exported. 
    // We might need to manually call initializeSocket.
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize socket server', () => {
    const server = {};
    const io = socketService.initializeSocket(server);
    
    expect(Server).toHaveBeenCalledWith(server, expect.any(Object));
    expect(io).toBeDefined();
    expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
  });

  test('should attach authentication middleware', () => {
    const server = {};
    socketService.initializeSocket(server);
    expect(mockIo.use).toHaveBeenCalled();
  });

  test('should emit new order to kitchen', () => {
    // Ensure io is set
    socketService.initializeSocket({});
    
    const order = { id: 1, items: [] };
    socketService.emitNewOrder(order);
    
    expect(mockIo.to).toHaveBeenCalledWith('kitchen');
    expect(mockIo.emit).toHaveBeenCalledWith('order:new', order);
  });
});
