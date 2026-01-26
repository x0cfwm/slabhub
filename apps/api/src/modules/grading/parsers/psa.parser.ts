import * as cheerio from 'cheerio';
import { GradingLookupResult } from '../types/grading.types';

export class PsaParser {
    static parse(html: string, certNumber: string): GradingLookupResult {
        const $ = cheerio.load(html);

        // PSA pages often have a table with labels in <th> and values in <td>
        const data: Record<string, string> = {};

        $('table.table tr').each((_, el) => {
            const label = $(el).find('th').text().trim().replace(':', '');
            const value = $(el).find('td').text().trim();
            if (label && value) {
                data[label] = value;
            }
        });

        // Fallback selectors if table structure is different
        const cardName = data['Card'] || data['Description'] ||
            (data['Brand'] && data['Subject'] ? `${data['Brand']} ${data['Subject']}` : data['Brand'] || data['Subject']) ||
            $('h1').first().text().trim();

        const setName = data['Set'] || data['Year'] || '';
        const gradeLabel = data['Grade'] || $('.cert-grade-label').text().trim() || '';
        const cardNumber = data['Card Number'] || '';

        // Extract numeric grade from label like "GEM MT 10"
        const gradeMatch = gradeLabel.match(/(\d+(\.\d+)?)/);
        const gradeValue = gradeMatch ? parseFloat(gradeMatch[1]) : gradeLabel;

        if (!cardName && !gradeLabel) {
            return {
                grader: 'PSA',
                certNumber,
                success: false,
                error: 'Could not parse PSA certificate page contents',
            };
        }

        return {
            grader: 'PSA',
            certNumber,
            success: true,
            data: {
                gradeLabel,
                gradeValue,
                cardName,
                setName,
                cardNumber,
                year: data['Year'],
                variant: data['Variety'] || data['Variety/Pedigree'],
                population: data['Population'] ? parseInt(data['Population'].replace(/,/g, '')) : undefined,
                raw: data,
            },
        };
    }
}
