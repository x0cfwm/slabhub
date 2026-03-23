import { BgsParser } from '../../src/modules/grading/parsers/bgs.parser';
import { PsaParser } from '../../src/modules/grading/parsers/psa.parser';
import { GradingTestCommand } from '../../src/modules/grading/cli/grading-test.command';

describe('Grading parsers and CLI', () => {
  it('PsaParser extracts grade info from html', () => {
    const html = `
      <table class="table">
        <tr><th>Grade:</th><td>GEM MT 10</td></tr>
        <tr><th>Card Number:</th><td>OP01-001</td></tr>
        <tr><th>Brand:</th><td>One Piece</td></tr>
      </table>
    `;

    const out = PsaParser.parse(html, 'cert-1');
    expect(out.success).toBe(true);
    expect(out.data?.gradeLabel).toContain('10');
  });

  it('BgsParser returns not configured result', () => {
    const out = BgsParser.parse('<html></html>', 'b1');
    expect(out.success).toBe(false);
  });

  it('GradingTestCommand requires --file option', async () => {
    const command = new GradingTestCommand({ recognizeFromImage: jest.fn() } as any);
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await command.run([], {} as any);

    expect(spy).toHaveBeenCalled();
  });
});
