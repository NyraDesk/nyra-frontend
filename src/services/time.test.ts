import { getDynamicGreeting } from './time';

describe('getDynamicGreeting', () => {
  test('restituisce "Buongiorno" per ore mattutine (5:00-11:59)', () => {
    const morningTimes = [
      new Date('2024-01-01T05:00:00'),
      new Date('2024-01-01T08:30:00'),
      new Date('2024-01-01T11:59:59')
    ];
    
    morningTimes.forEach(time => {
      expect(getDynamicGreeting(time)).toBe('Buongiorno, in cosa posso aiutarti oggi?');
    });
  });

  test('restituisce "Buon pomeriggio" per ore pomeridiane (12:00-17:59)', () => {
    const afternoonTimes = [
      new Date('2024-01-01T12:00:00'),
      new Date('2024-01-01T15:30:00'),
      new Date('2024-01-01T17:59:59')
    ];
    
    afternoonTimes.forEach(time => {
      expect(getDynamicGreeting(time)).toBe('Buon pomeriggio, in cosa posso aiutarti oggi?');
    });
  });

  test('restituisce "Buonasera" per ore serali e notturne (18:00-04:59)', () => {
    const eveningTimes = [
      new Date('2024-01-01T18:00:00'),
      new Date('2024-01-01T21:30:00'),
      new Date('2024-01-01T23:59:59'),
      new Date('2024-01-01T00:00:00'),
      new Date('2024-01-01T04:59:59')
    ];
    
    eveningTimes.forEach(time => {
      expect(getDynamicGreeting(time)).toBe('Buonasera, in cosa posso aiutarti oggi?');
    });
  });

  test('usa l\'ora corrente se non viene specificata una data', () => {
    const result = getDynamicGreeting();
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^(Buongiorno|Buon pomeriggio|Buonasera), in cosa posso aiutarti oggi\?$/);
  });
});
