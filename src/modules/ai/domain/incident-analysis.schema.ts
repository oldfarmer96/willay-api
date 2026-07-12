import {
  EntityType,
  IncidentCategory,
  IncidentType,
  Sentiment,
  UrgencyLevel,
} from '@/generated/prisma/enums';
import { z } from 'zod';

export const incidentTypeSchema = z.enum(IncidentType);

export const incidentCategorySchema = z.enum(IncidentCategory);

export const urgencyLevelSchema = z.enum(UrgencyLevel);

export const sentimentSchema = z.enum(Sentiment);

export const entityTypeSchema = z.enum(EntityType);

export const incidentAnalysisSchema = z
  .object({
    type: incidentTypeSchema,
    category: incidentCategorySchema,
    urgency: urgencyLevelSchema,

    improvedDescription: z.string().min(10).max(1_500),

    recommendedAction: z.string().min(5).max(1_500),

    requiresSupervision: z.boolean(),

    sentiment: sentimentSchema,

    keywords: z.array(z.string().min(1).max(80)).min(3).max(8),

    entities: z
      .array(
        z
          .object({
            type: entityTypeSchema,
            value: z.string().min(1).max(250),
            confidence: z.number().min(0).max(1).nullable(),
          })
          .strict(),
      )
      .max(20),
  })
  .strict();

export type IncidentAnalysis = z.infer<typeof incidentAnalysisSchema>;

// export const incidentAnalysisJsonSchema = z.toJSONSchema(
//   incidentAnalysisSchema,
//   {
//     target: 'draft-07',
//     reused: 'inline',
//   },
// );

export const incidentAnalysisJsonSchema = {
  type: 'object',

  additionalProperties: false,

  required: [
    'type',
    'category',
    'urgency',
    'improvedDescription',
    'recommendedAction',
    'requiresSupervision',
    'sentiment',
    'keywords',
    'entities',
  ],

  properties: {
    type: {
      type: 'string',
      enum: [
        'INFRASTRUCTURE',
        'SECURITY',
        'HEALTH',
        'ENVIRONMENT',
        'NOISE',
        'TRAFFIC',
        'PUBLIC_SERVICES',
        'SOCIAL',
        'EMERGENCY',
        'OTHER',
      ],
    },

    category: {
      type: 'string',
      enum: [
        'FALLEN_UTILITY_POLE',
        'WATER_OUTAGE',
        'POWER_OUTAGE',
        'STREET_FIGHT',
        'THEFT',
        'TRAFFIC_ACCIDENT',
        'GARBAGE_ACCUMULATION',
        'POTHOLE',
        'FLOOD',
        'FIRE',
        'EXCESSIVE_NOISE',
        'VANDALISM',
        'LOOSE_ANIMALS',
        'AMBULANCE_REQUIRED',
        'POLICE_REQUIRED',
        'OTHER',
      ],
    },

    urgency: {
      type: 'string',
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    },

    improvedDescription: {
      type: 'string',
    },

    recommendedAction: {
      type: 'string',
    },

    requiresSupervision: {
      type: 'boolean',
    },

    sentiment: {
      type: 'string',
      enum: ['NEUTRAL', 'WORRIED', 'PANIC', 'ANGRY', 'URGENT'],
    },

    keywords: {
      type: 'array',
      items: {
        type: 'string',
      },
    },

    entities: {
      type: 'array',
      items: {
        type: 'object',

        additionalProperties: false,

        required: ['type', 'value', 'confidence'],

        properties: {
          type: {
            type: 'string',
            enum: [
              'PERSON',
              'LOCATION',
              'ORGANIZATION',
              'LANDMARK',
              'VEHICLE',
              'OBJECT',
              'OTHER',
            ],
          },

          value: {
            type: 'string',
          },

          confidence: {
            type: ['number', 'null'],
          },
        },
      },
    },
  },
} as const;
