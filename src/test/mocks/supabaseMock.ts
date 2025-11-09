import * as sinon from 'sinon';
import { PostgrestQueryBuilder } from '@supabase/postgrest-js';
import { mockTimeEntries, mockUser } from '../fixtures/mockData';

type QueryResponse<T = any> = Promise<{ data: T | null; error: null | { message: string } }>;

export function createSupabaseQueryBuilder(sandbox: sinon.SinonSandbox): PostgrestQueryBuilder<any, any, any, any> {
    const createChainableStub = () => {
        const stub: any = sandbox.stub().resolves({ data: [], error: null });
        
        // Basic query methods
        stub.eq = sandbox.stub().returns(stub);
        stub.neq = sandbox.stub().returns(stub);
        stub.gt = sandbox.stub().returns(stub);
        stub.gte = sandbox.stub().returns(stub);
        stub.lt = sandbox.stub().returns(stub);
        stub.lte = sandbox.stub().returns(stub);
        stub.like = sandbox.stub().returns(stub);
        stub.ilike = sandbox.stub().returns(stub);
        stub.is = sandbox.stub().returns(stub);
        stub.in = sandbox.stub().returns(stub);
        stub.contains = sandbox.stub().returns(stub);
        stub.contained = sandbox.stub().returns(stub);
        stub.rangeLt = sandbox.stub().returns(stub);
        stub.rangeGt = sandbox.stub().returns(stub);
        stub.rangeGte = sandbox.stub().returns(stub);
        stub.rangeLte = sandbox.stub().returns(stub);
        stub.match = sandbox.stub().returns(stub);
        stub.not = sandbox.stub().returns(stub);
        stub.or = sandbox.stub().returns(stub);
        stub.filter = sandbox.stub().returns(stub);
        
        // Chainable methods that might return different data
        stub.select = sandbox.stub().returns(stub);
        stub.single = sandbox.stub().resolves({ data: { id: 1 }, error: null });
        stub.maybeSingle = sandbox.stub().resolves({ data: { id: 1 }, error: null });
        stub.limit = sandbox.stub().resolves({ data: [], error: null });
        stub.order = sandbox.stub().returns(stub);

        return stub;
    };

    // Create the main query builder
    const queryBuilder = createChainableStub();
    queryBuilder.url = new URL('http://localhost');
    queryBuilder.headers = {};

    // Configure chainable responses for common operations
    queryBuilder.select.returns(queryBuilder);
    queryBuilder.order.returns(queryBuilder);
    queryBuilder.limit.returns(queryBuilder);
    queryBuilder.single = sandbox.stub().resolves({ data: { id: 1 }, error: null });

    // Configure insert operations
    const insertChain = {
        select: sandbox.stub().returns({
            single: sandbox.stub().resolves({ data: { id: 1 }, error: null })
        })
    };
    queryBuilder.insert = sandbox.stub().returns(insertChain);

    // Configure update operations
    const updateChain = {
        eq: sandbox.stub().resolves({ data: null, error: null })
    };
    queryBuilder.update = sandbox.stub().returns(updateChain);

    // Configure response data for different queries
    const mockSession = {
        id: 1,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 5000).toISOString(),
        workspace_name: 'Test Project',
        is_active: false,
        duration: 5000
    };

    // Configure common chain responses with proper data
    queryBuilder.eq.returns(queryBuilder);
    queryBuilder.order.returns({
        limit: sandbox.stub().returns({
            single: sandbox.stub().resolves({ data: mockSession, error: null })
        })
    });

    // Make sure select operation returns consistent data
    queryBuilder.select.returns({
        order: sandbox.stub().returns({
            limit: sandbox.stub().returns({
                single: sandbox.stub().resolves({ data: mockSession, error: null })
            })
        })
    });

    return queryBuilder as any;
}
